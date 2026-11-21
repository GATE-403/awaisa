import { createHash, randomBytes } from 'node:crypto'
import type { CalendarFeed, CalendarFeedLink } from '@awaisa/contracts'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { CacheService } from '../cache/cache.service.js'
import type { Env } from '../config/env.js'
import { bookingEvent, type FeedBooking } from './calendar-events.js'
import { buildCalendar } from './ics.js'

/** Visits from a month back to three months ahead. */
const PAST_DAYS = 30
const AHEAD_DAYS = 90
/** How long one written feed is served again (any booking change bumps it sooner). */
const FEED_CACHE_SECONDS = 60
const REFRESH_MINUTES = 15
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

type FeedKind = 'master' | 'business'

/** Who a feed belongs to: a master (their visits) or a member of the business. */
type FeedOwner =
  | { kind: 'master'; businessId: string; specialistId: string; customerId: string }
  | { kind: 'business'; businessId: string; customerId: string }

type FeedRow = {
  id: string
  kind: FeedKind
  businessId: string
  customerId: string
  specialistId: string | null
  createdAt: Date
  lastReadAt: Date | null
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

@Injectable()
export class CalendarFeedsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService<Env, true>,
    private readonly cache: CacheService,
  ) {}

  async getFeed(owner: FeedOwner): Promise<CalendarFeed> {
    const [row, isPhoneShown] = await Promise.all([
      this.findFeed(owner),
      this.isPhoneShown(owner.businessId),
    ])
    return this.toView(row, isPhoneShown)
  }

  /** A new secret address; the previous one stops answering at once. */
  async issue(owner: FeedOwner, specialistId: string | null = null): Promise<CalendarFeedLink> {
    if (owner.kind === 'business' && specialistId) {
      await this.assertMaster(owner.businessId, specialistId)
    }
    const token = randomBytes(32).toString('base64url')
    const filter = owner.kind === 'master' ? owner.specialistId : specialistId
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM "calendar_feeds" WHERE ${this.ownerWhere(owner)}`,
        this.ownerParams(owner),
      )
      await manager.query(
        `INSERT INTO "calendar_feeds" ("kind", "business_id", "customer_id", "specialist_id", "token_hash")
         VALUES ($1, $2, $3, $4, $5)`,
        [owner.kind, owner.businessId, owner.customerId, filter, hashToken(token)],
      )
    })
    const web = this.config.get('PUBLIC_WEB_URL', { infer: true })
    return { url: `${web}/api/calendar/${token}.ics`, feed: await this.getFeed(owner) }
  }

  /** A business feed's master filter, keeping its address. */
  async setFilter(
    owner: FeedOwner & { kind: 'business' },
    specialistId: string | null,
  ): Promise<CalendarFeed> {
    if (specialistId) await this.assertMaster(owner.businessId, specialistId)
    const rows: unknown[] = await this.dataSource.query(
      `UPDATE "calendar_feeds" SET "specialist_id" = $3 WHERE ${this.ownerWhere(owner)} RETURNING "id"`,
      [...this.ownerParams(owner), specialistId],
    )
    if (rows.length === 0) throw new NotFoundException('Ссылки на календарь ещё нет')
    return this.getFeed(owner)
  }

  async remove(owner: FeedOwner) {
    await this.dataSource.query(
      `DELETE FROM "calendar_feeds" WHERE ${this.ownerWhere(owner)}`,
      this.ownerParams(owner),
    )
  }

  async setPhonesShown(businessId: string, isShown: boolean) {
    await this.dataSource.query(`UPDATE "businesses" SET "calendar_phones" = $2 WHERE "id" = $1`, [
      businessId,
      isShown,
    ])
  }

  /** The ICS text behind a secret address, or 404 for a wrong, replaced or orphaned one. */
  async render(token: string): Promise<string> {
    if (!TOKEN_PATTERN.test(token)) throw new NotFoundException()
    const [feed]: (FeedRow & { slug: string; businessName: string; isPhoneShown: boolean })[] =
      await this.dataSource.query(
        `SELECT f."id", f."kind", f."business_id" AS "businessId", f."customer_id" AS "customerId",
           f."specialist_id" AS "specialistId", bz."slug", bz."name" AS "businessName",
           bz."calendar_phones" AS "isPhoneShown"
         FROM "calendar_feeds" f JOIN "businesses" bz ON bz."id" = f."business_id"
         WHERE f."token_hash" = $1`,
        [hashToken(token)],
      )
    if (!feed || !(await this.isStillAllowed(feed))) throw new NotFoundException()

    void this.markRead(feed.id)
    return this.cache.remember(`calendar:${feed.id}`, FEED_CACHE_SECONDS, ['availability'], () =>
      this.write(feed),
    )
  }

  private async write(
    feed: FeedRow & { slug: string; businessName: string; isPhoneShown: boolean },
  ) {
    const now = new Date()
    const from = new Date(now.getTime() - PAST_DAYS * 86_400_000)
    const to = new Date(now.getTime() + AHEAD_DAYS * 86_400_000)
    const bookings: FeedBooking[] = await this.dataSource.query(
      `SELECT b."id", b."starts_at" AS "startsAt", b."ends_at" AS "endsAt", b."status",
         b."payment_status" AS "paymentStatus", s."name" AS "serviceName",
         sp."name" AS "specialistName", b."customer_name" AS "customerName",
         b."customer_phone" AS "customerPhone", b."comment", br."name" AS "branchName",
         br."address" AS "branchAddress", s."price", b."discount_amount" AS "discountAmount"
       FROM "bookings" b
       JOIN "services" s ON s."id" = b."service_id"
       JOIN "specialists" sp ON sp."id" = b."specialist_id"
       LEFT JOIN "branches" br ON br."id" = b."branch_id"
       WHERE b."business_id" = $1 AND b."starts_at" >= $2 AND b."starts_at" < $3
         AND ($4::varchar IS NULL OR b."specialist_id" = $4)
         -- An unpaid hold that ran out was never a visit.
         AND NOT (b."status" = 'cancelled' AND b."payment_status" = 'expired')
       ORDER BY b."starts_at"`,
      [feed.businessId, from, to, feed.specialistId],
    )
    const [master] = feed.specialistId
      ? ((await this.dataSource.query(`SELECT "name" FROM "specialists" WHERE "id" = $1`, [
          feed.specialistId,
        ])) as { name: string }[])
      : []
    const options = {
      isMasterNamed: !feed.specialistId,
      isPhoneShown: feed.isPhoneShown,
      webUrl: this.config.get('PUBLIC_WEB_URL', { infer: true }),
      slug: feed.slug,
      audience: feed.kind,
    } as const

    return buildCalendar({
      name: master ? `${master.name} · ${feed.businessName}` : feed.businessName,
      refreshMinutes: REFRESH_MINUTES,
      now,
      events: bookings.map((booking) =>
        bookingEvent(
          {
            ...booking,
            startsAt: new Date(booking.startsAt),
            endsAt: new Date(booking.endsAt),
            price: Number(booking.price),
            discountAmount: booking.discountAmount === null ? null : Number(booking.discountAmount),
          },
          options,
        ),
      ),
    })
  }

  /** A master who left or a member who lost access no longer reads the business's visits. */
  private async isStillAllowed(feed: FeedRow) {
    if (feed.kind === 'master') {
      // Still this master, still signed in with the number the owner gave them.
      const rows: unknown[] = await this.dataSource.query(
        `SELECT 1 FROM "specialists" sp JOIN "customers" c ON c."phone" = sp."phone"
         WHERE sp."id" = $1 AND sp."business_id" = $2 AND sp."is_active" AND c."id" = $3`,
        [feed.specialistId, feed.businessId, feed.customerId],
      )
      return rows.length > 0
    }
    const [customer]: { phone: string; isMember: boolean }[] = await this.dataSource.query(
      `SELECT c."phone", EXISTS (
         SELECT 1 FROM "business_members" m WHERE m."business_id" = $2 AND m."customer_id" = c."id"
       ) AS "isMember"
       FROM "customers" c WHERE c."id" = $1`,
      [feed.customerId, feed.businessId],
    )
    if (!customer) return false
    return (
      customer.isMember || this.config.get('ADMIN_PHONES', { infer: true }).includes(customer.phone)
    )
  }

  // At most once an hour: calendars poll often and this is only a «last synced» hint.
  private async markRead(id: string) {
    try {
      await this.dataSource.query(
        `UPDATE "calendar_feeds" SET "last_read_at" = now()
         WHERE "id" = $1 AND ("last_read_at" IS NULL OR "last_read_at" < now() - interval '1 hour')`,
        [id],
      )
    } catch {
      // A hint only: the feed is served either way.
    }
  }

  private async findFeed(owner: FeedOwner): Promise<FeedRow | undefined> {
    const [row]: FeedRow[] = await this.dataSource.query(
      `SELECT "id", "kind", "business_id" AS "businessId", "customer_id" AS "customerId",
         "specialist_id" AS "specialistId", "created_at" AS "createdAt", "last_read_at" AS "lastReadAt"
       FROM "calendar_feeds" WHERE ${this.ownerWhere(owner)}`,
      this.ownerParams(owner),
    )
    return row
  }

  private async isPhoneShown(businessId: string) {
    const [row]: { isShown: boolean }[] = await this.dataSource.query(
      `SELECT "calendar_phones" AS "isShown" FROM "businesses" WHERE "id" = $1`,
      [businessId],
    )
    return row?.isShown ?? false
  }

  private async assertMaster(businessId: string, specialistId: string) {
    const rows: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM "specialists" WHERE "id" = $1 AND "business_id" = $2`,
      [specialistId, businessId],
    )
    if (rows.length === 0) throw new BadRequestException('Такого мастера нет')
  }

  private ownerWhere(owner: FeedOwner) {
    return owner.kind === 'master'
      ? `"kind" = 'master' AND "business_id" = $1 AND "specialist_id" = $2`
      : `"kind" = 'business' AND "business_id" = $1 AND "customer_id" = $2`
  }

  private ownerParams(owner: FeedOwner) {
    return [owner.businessId, owner.kind === 'master' ? owner.specialistId : owner.customerId]
  }

  private toView(row: FeedRow | undefined, isPhoneShown: boolean): CalendarFeed {
    return {
      isActive: Boolean(row),
      createdAt: row ? new Date(row.createdAt).toISOString() : null,
      lastReadAt: row?.lastReadAt ? new Date(row.lastReadAt).toISOString() : null,
      specialistId: row?.kind === 'business' ? row.specialistId : null,
      isPhoneShown,
    }
  }
}

export type { FeedOwner }
