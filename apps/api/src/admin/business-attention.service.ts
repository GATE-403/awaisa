import type { BusinessAttention } from '@awaisa/contracts'
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { visitPrice } from '../bookings/visit-sql.js'
import type { Customer } from '../customers/customer.entity.js'
import { setupProgress, todayLoad } from './business-attention.js'

type Row = {
  slug: string
  role: string | null
  unmarkedVisits: number
  unansweredReviews: number
  failedReceipts: number
  todayRevenue: number
  bookedMinutes: number
  openMinutes: number
  hasServices: boolean
  hasMasters: boolean
  hasHours: boolean
  views: number
  previousViews: number
  bookings: number
  previousBookings: number
}

/** «За неделю» on each row, like the owner's «Страница» (`AnalyticsService.pageStats`). */
const WEEK_DAYS = 7

/** How far back «Мои бизнесы» looks for unmarked visits and reviews, as the schedule does. */
const ATTENTION_DAYS = 30

// What waits for someone in each of one's businesses, for the «Мои бизнесы» list: ended visits
// nobody marked, reviews without a reply (not «Решено»), receipts the provider refused. One
// query for every business, so a platform admin's list of all of them stays one round trip.
@Injectable()
export class BusinessAttentionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async forCustomer(customer: Customer, isPlatformAdmin: boolean): Promise<BusinessAttention[]> {
    const rows = (await this.dataSource.query(
      `SELECT bz."slug", m."role",
         (SELECT COUNT(*)::int FROM "bookings" b
           WHERE b."business_id" = bz."id" AND b."status" = 'confirmed' AND b."outcome" IS NULL
             AND b."ends_at" < now() AND b."starts_at" > now() - make_interval(days => $3)
         ) AS "unmarkedVisits",
         (SELECT COUNT(*)::int FROM "reviews" r
           WHERE r."business_id" = bz."id" AND r."reply" IS NULL AND NOT r."is_hidden"
             AND r."resolved_at" IS NULL AND r."created_at" > now() - make_interval(days => $3)
         ) AS "unansweredReviews",
         (SELECT COUNT(*)::int FROM "fiscal_receipts" f
           WHERE f."business_id" = bz."id" AND f."status" = 'failed'
         ) AS "failedReceipts",
         -- Today in business time (UTC+6): what the day's visits bring and how full it is.
         (SELECT COALESCE(SUM(COALESCE(b."paid_amount", ${visitPrice()} - COALESCE(b."discount_amount", 0))), 0)::int
           FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           WHERE b."business_id" = bz."id" AND b."status" = 'confirmed'
             AND b."outcome" IS DISTINCT FROM 'no_show'
             AND b."starts_at" >= today."starts" AND b."starts_at" < today."starts" + interval '1 day'
         ) AS "todayRevenue",
         (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (b."ends_at" - b."starts_at")) / 60), 0)::int
           FROM "bookings" b
           WHERE b."business_id" = bz."id" AND b."status" = 'confirmed'
             AND b."starts_at" >= today."starts" AND b."starts_at" < today."starts" + interval '1 day'
         ) AS "bookedMinutes",
         COALESCE((SELECT (wh."closes_minutes" - wh."opens_minutes")
             * (SELECT COUNT(*) FROM "specialists" sp WHERE sp."business_id" = bz."id" AND sp."is_active")
           FROM "working_hours" wh
           WHERE wh."business_id" = bz."id" AND wh."weekday" = today."weekday"), 0)::int AS "openMinutes",
         -- How far from taking bookings, as the cabinet's «Запуск записи» counts it.
         EXISTS (SELECT 1 FROM "services" s WHERE s."business_id" = bz."id" AND s."is_active") AS "hasServices",
         EXISTS (SELECT 1 FROM "specialists" sp JOIN "specialist_services" ss ON ss."specialist_id" = sp."id"
           WHERE sp."business_id" = bz."id" AND sp."is_active") AS "hasMasters",
         EXISTS (SELECT 1 FROM "working_hours" wh WHERE wh."business_id" = bz."id") AS "hasHours",
         -- The week: devices that opened the page and online bookings, this week and the one before.
         (SELECT COUNT(DISTINCT fe."session") FROM "funnel_events" fe
           WHERE fe."slug" = bz."slug" AND fe."step" = 'business'
             AND fe."created_at" >= now() - make_interval(days => $4))::int AS "views",
         (SELECT COUNT(DISTINCT fe."session") FROM "funnel_events" fe
           WHERE fe."slug" = bz."slug" AND fe."step" = 'business'
             AND fe."created_at" >= now() - make_interval(days => $4 * 2)
             AND fe."created_at" < now() - make_interval(days => $4))::int AS "previousViews",
         (SELECT COUNT(*) FROM "bookings" b
           WHERE b."business_id" = bz."id" AND b."source" = 'online' AND b."status" = 'confirmed'
             AND b."created_at" >= now() - make_interval(days => $4))::int AS "bookings",
         (SELECT COUNT(*) FROM "bookings" b
           WHERE b."business_id" = bz."id" AND b."source" = 'online' AND b."status" = 'confirmed'
             AND b."created_at" >= now() - make_interval(days => $4 * 2)
             AND b."created_at" < now() - make_interval(days => $4))::int AS "previousBookings"
       FROM "businesses" bz
       CROSS JOIN LATERAL (
         SELECT ((now() AT TIME ZONE 'UTC' + interval '6 hours')::date - interval '6 hours')
             AT TIME ZONE 'UTC' AS "starts",
           EXTRACT(ISODOW FROM (now() AT TIME ZONE 'UTC' + interval '6 hours'))::int - 1 AS "weekday"
       ) today
       LEFT JOIN "business_members" m ON m."business_id" = bz."id" AND m."customer_id" = $1
       WHERE bz."deleted_at" IS NULL AND (m."customer_id" IS NOT NULL OR $2::boolean)`,
      [customer.id, isPlatformAdmin, ATTENTION_DAYS, WEEK_DAYS],
    )) as Row[]

    return rows.map((row) => ({
      slug: row.slug,
      unmarkedVisits: row.unmarkedVisits,
      unansweredReviews: row.unansweredReviews,
      // Receipts are the owner's settings («Настройки → Касса»): administrators cannot fix them.
      failedReceipts: row.role === 'staff' ? 0 : row.failedReceipts,
      // Money is the owner's: administrators see the day's load, not its sum.
      todayRevenue: row.role === 'staff' ? null : row.todayRevenue,
      todayLoad: todayLoad(row.bookedMinutes, row.openMinutes),
      setup: setupProgress({
        services: row.hasServices,
        masters: row.hasMasters,
        hours: row.hasHours,
      }),
      week: {
        views: row.views,
        previousViews: row.previousViews,
        bookings: row.bookings,
        previousBookings: row.previousBookings,
      },
    }))
  }
}
