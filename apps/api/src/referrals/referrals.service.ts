import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { PUBLIC_ID_PATTERN, publicIdSql, saltOf } from '../common/public-id.js'
import type { Env } from '../config/env.js'

/**
 * «Invite a friend»: a profile link carries `?ref=<handle or public id>`; the friend's first
 * booking records who brought them. A friend counts once they have actually come (a past visit
 * that was not a no-show), see `ProfilesService`.
 */
@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** The phone behind a `ref` (a handle or a public id), or null. */
  async referrerPhone(ref: string) {
    const value = ref.trim().toLowerCase()
    const rows = (await (PUBLIC_ID_PATTERN.test(value)
      ? this.dataSource.query(
          `SELECT "phone" FROM "customers" WHERE ${publicIdSql('"phone"', '$2')} = $1 LIMIT 1`,
          [value, saltOf(this.config.get('AUTH_SECRET', { infer: true }))],
        )
      : this.dataSource.query(
          'SELECT "phone" FROM "customers" WHERE lower("handle") = $1 LIMIT 1',
          [value],
        ))) as { phone: string }[]
    return rows[0]?.phone ?? null
  }

  /** After a booking: only a first-time client, never oneself, at most one referrer per phone. */
  async recordFirstBooking(ref: string, friendPhone: string) {
    try {
      const referrer = await this.referrerPhone(ref)
      if (!referrer || referrer === friendPhone) return
      const [earlier] = (await this.dataSource.query(
        `SELECT COUNT(*)::int AS "count" FROM "bookings" WHERE "customer_phone" = $1 AND "status" = 'confirmed'`,
        [friendPhone],
      )) as { count: number }[]
      if ((earlier?.count ?? 0) > 1) return
      await this.dataSource.query(
        `INSERT INTO "referrals" ("referrer_phone", "friend_phone") VALUES ($1, $2)
         ON CONFLICT ("friend_phone") DO NOTHING`,
        [referrer, friendPhone],
      )
    } catch (error) {
      // An invitation must never break a booking.
      this.logger.warn(`Referral not recorded: ${String(error)}`)
    }
  }

  /** Friends who came: brought by this phone and with at least one past visit. */
  async friendsOf(phone: string) {
    const [row] = (await this.dataSource.query(
      `SELECT COUNT(*)::int AS "count" FROM "referrals" r
       WHERE r."referrer_phone" = $1 AND EXISTS (
         SELECT 1 FROM "bookings" b WHERE b."customer_phone" = r."friend_phone"
           AND b."status" = 'confirmed' AND b."starts_at" < now()
           AND b."outcome" IS DISTINCT FROM 'no_show')`,
      [phone],
    )) as { count: number }[]
    return row?.count ?? 0
  }
}
