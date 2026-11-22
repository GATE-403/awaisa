import type { FollowedMaster } from '@awaisa/contracts'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { AvailabilityService } from '../bookings/availability.service.js'
import { UNDO_WINDOW_SECONDS } from '../bookings/booking-rules.js'
import { addDays, formatMinutes, toBusinessParts } from '../common/business-time.js'
import type { Env } from '../config/env.js'
import { ClientMessagesService } from '../notifications/client-messages.service.js'
import { dayWords, freedText, movedText, worksText } from './follow-messages.js'

type Row = Record<string, unknown>

// A follower hears about one master at most this often (freed time and new works alike).
const QUIET_DAYS = 7
// A cancellation counts once it is past its undo window and not older than this.
const FRESH_CANCEL_MINUTES = 30
// Only freed time worth acting on: from an hour ahead to two days ahead.
const FREED_FROM_MINUTES = 60
const FREED_UNTIL_HOURS = 48

const rowsOf = (result: unknown) =>
  (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as Row[]

/**
 * Clients follow their master (in beauty they are loyal to the master, not the salon) and hear
 * what leads to a booking: time freed with them, the master moving to another place, and, only
 * when they turned it on, new works. Never more than once a week per master, and freed time of
 * one master goes out once a day at most.
 */
@Injectable()
export class FollowsService {
  private readonly logger = new Logger(FollowsService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly availability: AvailabilityService,
    private readonly messages: ClientMessagesService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async list(customerId: string): Promise<FollowedMaster[]> {
    const rows = (await this.dataSource.query(
      `SELECT sp."id", sp."name", sp."role", sp."photo_url" AS "photoUrl", sp."is_active" AS "isActive",
         b."slug", b."name" AS "businessName", f."notify_works" AS "notifyWorks"
       FROM "master_follows" f
       JOIN "specialists" sp ON sp."id" = f."specialist_id"
       JOIN "businesses" b ON b."id" = sp."business_id"
       WHERE f."customer_id" = $1
       ORDER BY f."created_at" DESC`,
      [customerId],
    )) as Row[]
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      role: String(row.role ?? ''),
      photoUrl: (row.photoUrl as string | null) ?? null,
      isActive: Boolean(row.isActive),
      business: { slug: String(row.slug), name: String(row.businessName) },
      notifyWorks: Boolean(row.notifyWorks),
    }))
  }

  async follow(customerId: string, specialistId: string, notifyWorks?: boolean) {
    const [master] = (await this.dataSource.query(
      `SELECT 1 FROM "specialists" sp JOIN "businesses" b ON b."id" = sp."business_id"
       WHERE sp."id" = $1 AND sp."is_active" AND b."is_published"`,
      [specialistId],
    )) as Row[]
    if (!master) throw new NotFoundException('Мастер не найден')
    await this.dataSource.query(
      `INSERT INTO "master_follows" ("customer_id", "specialist_id", "notify_works")
       VALUES ($1, $2, COALESCE($3, false))
       ON CONFLICT ("customer_id", "specialist_id")
       DO UPDATE SET "notify_works" = COALESCE($3, "master_follows"."notify_works")`,
      [customerId, specialistId, notifyWorks ?? null],
    )
    return this.list(customerId)
  }

  async unfollow(customerId: string, specialistId: string) {
    await this.dataSource.query(
      'DELETE FROM "master_follows" WHERE "customer_id" = $1 AND "specialist_id" = $2',
      [customerId, specialistId],
    )
    return this.list(customerId)
  }

  /** How many follow the master: «Мой день» shows the number, never the people. */
  async countFor(specialistId: string) {
    const [row] = (await this.dataSource.query(
      'SELECT COUNT(*)::int AS "count" FROM "master_follows" WHERE "specialist_id" = $1',
      [specialistId],
    )) as { count: number }[]
    return Number(row?.count ?? 0)
  }

  /**
   * Time freed by a cancellation (past its undo window) with a followed master, today or
   * tomorrow: checked to be free still, claimed once per master and day, then each follower
   * not heard from this week and not already booked with the master that day gets one message.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async notifyFreed() {
    const cancellations = (await this.dataSource.query(
      `SELECT DISTINCT ON (b."specialist_id") b."service_id" AS "serviceId",
         b."specialist_id" AS "specialistId", b."starts_at" AS "startsAt",
         b."customer_phone" AS "phone", sp."name" AS "masterName",
         bz."name" AS "businessName", bz."slug"
       FROM "bookings" b
       JOIN "specialists" sp ON sp."id" = b."specialist_id" AND sp."is_active"
       JOIN "businesses" bz ON bz."id" = b."business_id" AND bz."is_published"
       WHERE b."status" = 'cancelled'
         AND b."cancelled_at" <= now() - make_interval(secs => $1)
         AND b."cancelled_at" > now() - make_interval(mins => $2)
         AND b."starts_at" > now() + make_interval(mins => $3)
         AND b."starts_at" < now() + make_interval(hours => $4)
         AND EXISTS (SELECT 1 FROM "master_follows" f WHERE f."specialist_id" = b."specialist_id")
       ORDER BY b."specialist_id", b."starts_at"`,
      [UNDO_WINDOW_SECONDS, FRESH_CANCEL_MINUTES, FREED_FROM_MINUTES, FREED_UNTIL_HOURS],
    )) as Row[]

    for (const row of cancellations) {
      try {
        await this.notifyFreedOne(row)
      } catch (error) {
        this.logger.warn(`Freed time for followers skipped: ${(error as Error).message}`)
      }
    }
  }

  private async notifyFreedOne(row: Row) {
    const specialistId = String(row.specialistId)
    const { dateKey, minutes } = toBusinessParts(new Date(row.startsAt as string))
    const time = formatMinutes(minutes)
    const { slots } = await this.availability.getAvailability({
      serviceId: String(row.serviceId),
      specialistId,
      date: dateKey,
    })
    if (!slots.some((slot) => slot.time === time && slot.isAvailable)) return

    const claimed = rowsOf(
      await this.dataSource.query(
        `INSERT INTO "master_follow_notices" ("specialist_id", "day") VALUES ($1, $2)
         ON CONFLICT DO NOTHING RETURNING "specialist_id"`,
        [specialistId, toBusinessParts(new Date()).dateKey],
      ),
    )
    if (claimed.length === 0) return

    const followers = rowsOf(
      await this.dataSource.query(
        `UPDATE "master_follows" f SET "last_notified_at" = now()
         FROM "customers" c
         WHERE c."id" = f."customer_id" AND f."specialist_id" = $1
           AND (f."last_notified_at" IS NULL OR f."last_notified_at" < now() - make_interval(days => $2))
           AND c."phone" <> $3
           AND NOT EXISTS (
             SELECT 1 FROM "bookings" x
             WHERE x."customer_phone" = c."phone" AND x."specialist_id" = $1
               AND x."status" = 'confirmed'
               AND x."starts_at" >= $4::timestamptz - interval '1 day'
               AND x."starts_at" < $4::timestamptz + interval '1 day')
         RETURNING c."phone"`,
        [specialistId, QUIET_DAYS, String(row.phone), row.startsAt],
      ),
    )
    const today = toBusinessParts(new Date()).dateKey
    const params = new URLSearchParams({
      service: String(row.serviceId),
      specialist: specialistId,
      date: dateKey,
      time,
    })
    const link = `${this.webUrl()}/${String(row.slug)}/book?${params}`
    const text = freedText(
      String(row.masterName),
      String(row.businessName),
      dayWords(dateKey, today, addDays(today, 1)),
      time,
      link,
    )
    for (const follower of followers) {
      void this.messages.send(String(follower.phone), {
        text,
        link: { label: 'Записаться', url: link },
      })
    }
    if (followers.length > 0) this.logger.log(`Freed time to ${followers.length} follower(s)`)
  }

  /**
   * A master who left one place and works at another (the same sign-in number on an active
   * master there): their followers hear it once and follow the new place's master.
   */
  @Cron('0 5 * * *')
  async notifyMoved() {
    const moved = rowsOf(
      await this.dataSource.query(
        `UPDATE "master_follows" f SET "moved_notified_to" = n."id"
         FROM "specialists" o, "specialists" n, "businesses" nb, "customers" c
         WHERE o."id" = f."specialist_id" AND NOT o."is_active" AND o."phone" IS NOT NULL
           AND n."phone" = o."phone" AND n."business_id" <> o."business_id" AND n."is_active"
           AND nb."id" = n."business_id" AND nb."is_published"
           AND c."id" = f."customer_id"
           AND f."moved_notified_to" IS DISTINCT FROM n."id"
         RETURNING c."id" AS "customerId", c."phone", n."id" AS "specialistId",
           n."name" AS "masterName", nb."name" AS "businessName", nb."slug"`,
      ),
    )
    for (const row of moved) {
      await this.dataSource.query(
        `INSERT INTO "master_follows" ("customer_id", "specialist_id") VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [row.customerId, row.specialistId],
      )
      const link = `${this.webUrl()}/${String(row.slug)}/book?specialist=${String(row.specialistId)}`
      void this.messages.send(String(row.phone), {
        text: movedText(String(row.masterName), String(row.businessName), link),
        link: { label: 'Записаться', url: link },
      })
    }
  }

  /** Mondays at noon in Bishkek: new works of a followed master, for those who asked for them. */
  @Cron('0 6 * * 1')
  async notifyWorks() {
    const due = rowsOf(
      await this.dataSource.query(
        `WITH fresh AS (
           SELECT f."customer_id", f."specialist_id", COUNT(w.*)::int AS "count",
             (ARRAY_AGG(w."id" ORDER BY w."created_at" DESC))[1] AS "latest"
           FROM "master_follows" f
           JOIN "work_photos" w ON w."specialist_id" = f."specialist_id" AND NOT w."is_hidden"
             AND w."created_at" > COALESCE(f."works_notified_at", f."created_at")
           WHERE f."notify_works"
             AND (f."last_notified_at" IS NULL OR f."last_notified_at" < now() - make_interval(days => $1))
           GROUP BY 1, 2
         )
         UPDATE "master_follows" f SET "works_notified_at" = now(), "last_notified_at" = now()
         FROM fresh, "customers" c, "specialists" sp
         WHERE f."customer_id" = fresh."customer_id" AND f."specialist_id" = fresh."specialist_id"
           AND c."id" = f."customer_id" AND sp."id" = f."specialist_id"
         RETURNING c."phone", sp."name" AS "masterName", fresh."count", fresh."latest"`,
        [QUIET_DAYS],
      ),
    )
    for (const row of due) {
      const link = `${this.webUrl()}/feed?start=${String(row.latest)}`
      void this.messages.send(String(row.phone), {
        text: worksText(String(row.masterName), Number(row.count), link),
        link: { label: 'Смотреть', url: link },
      })
    }
  }

  private webUrl() {
    return this.config.get('PUBLIC_WEB_URL', { infer: true })
  }
}
