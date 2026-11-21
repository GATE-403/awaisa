import type { AnalyticsDays, AnalyticsReport, PageStats } from '@awaisa/contracts'
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { Business } from '../businesses/business.entity.js'
import {
  addDays,
  businessDateTimeToUtc,
  toBusinessParts,
  weekdayOf,
} from '../common/business-time.js'
import { MailingsService } from '../mailings/mailings.service.js'

type Totals = {
  visits: number
  revenue: number
  cancelled: number
  clients: number
  noShows: number
  materialsCost: number
  payments: { cash: number; card: number; transfer: number; unmarked: number }
}

// A visit counts unless the client did not show up; it earns what was paid, or the price
// when nobody marked the payment.
const DONE = `b."status" = 'confirmed' AND b."outcome" IS DISTINCT FROM 'no_show'`
// The price minus the discount the visit was booked with.
const PRICE = `(s."price" - COALESCE(b."discount_amount", 0))`
const EARNED = `COALESCE(b."paid_amount", ${PRICE})`

// What the visit used from the stock, at the unit cost of the day it was written off.
const MATERIALS = `(SELECT COALESCE(SUM(m."cost"), 0) FROM "stock_movements" m
  WHERE m."booking_id" = b."id" AND m."kind" = 'use')`

// Local business time (fixed UTC+6, see business-time.ts) for grouping by day and hour.
const LOCAL = `("b"."starts_at" AT TIME ZONE 'UTC' + interval '6 hours')`

const toNumber = (value: unknown) => Number(value ?? 0)

// «Давно не были»: the same segment and days as the mailing sheet opens with, so the count here
// is the count the mailing will reach.
const LAPSED_DAYS = 60
// A client «comes back» when they book again within six weeks (barbers and nails run on 3–5).
const RETURN_DAYS = 42
// A late cancellation: the client cancelled under a day before the visit (the deposit rule).
const LATE_CANCEL_HOURS = 24
// A client's own cancellation under LATE_CANCEL_HOURS before the visit.
const LATE = `b."status" = 'cancelled' AND b."cancelled_by" = 'client'
  AND b."cancelled_at" > b."starts_at" - make_interval(hours => ${LATE_CANCEL_HOURS})`
const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
]

const change = (current: number, previous: number) =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 100)

// What an owner looks at in a booking system's reports: money, visits, clients, who is busy.
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mailings: MailingsService,
  ) {}

  async setGoal(business: Business, goal: number | null) {
    await this.query('UPDATE "businesses" SET "revenue_goal" = $2 WHERE "id" = $1', [
      business.id,
      goal,
    ])
    return { goal }
  }

  async getReport(business: Business, days: number): Promise<AnalyticsReport> {
    const now = new Date()
    const today = toBusinessParts(now).dateKey
    const firstDay = addDays(today, -(days - 1))
    const from = businessDateTimeToUtc(firstDay, 0)
    const previousFrom = businessDateTimeToUtc(addDays(firstDay, -days), 0)
    const id = business.id

    const [
      current,
      previous,
      daily,
      previousDaily,
      services,
      masters,
      clients,
      heatmap,
      upcoming,
      hours,
      insights,
    ] = await Promise.all([
      this.totals(id, from, now),
      this.totals(id, previousFrom, from),
      this.daily(id, from, now),
      this.daily(id, previousFrom, from),
      this.query(
        `SELECT s."id", s."name", COUNT(*)::int AS "visits", SUM(${EARNED})::int AS "revenue",
             COALESCE(SUM(${MATERIALS}), 0)::int AS "materialsCost"
           FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           WHERE b."business_id" = $1 AND ${DONE}
             AND b."starts_at" >= $2 AND b."starts_at" < $3
           GROUP BY s."id" ORDER BY "revenue" DESC, "visits" DESC LIMIT 8`,
        [id, from, now],
      ),
      this.query(
        `SELECT sp."id", sp."name", sp."role", sp."commission_percent" AS "percent",
             COUNT(b."id") FILTER (WHERE ${DONE})::int AS "visits",
             COALESCE(SUM(${EARNED}) FILTER (WHERE ${DONE}), 0)::int AS "revenue",
             COALESCE(SUM(s."duration_minutes") FILTER (WHERE ${DONE}), 0)::int AS "bookedMinutes",
             (SELECT COUNT(*) FROM "reviews" r WHERE r."specialist_id" = sp."id"
                AND r."created_at" >= $2 AND r."created_at" < $3)::int AS "reviews",
             (SELECT round(avg(r."rating")::numeric, 1) FROM "reviews" r WHERE r."specialist_id" = sp."id"
                AND r."created_at" >= $2 AND r."created_at" < $3)::float AS "rating"
           FROM "specialists" sp
           LEFT JOIN "bookings" b ON b."specialist_id" = sp."id"
             AND b."starts_at" >= $2 AND b."starts_at" < $3
           LEFT JOIN "services" s ON s."id" = b."service_id"
           WHERE sp."business_id" = $1 AND sp."is_active"
           GROUP BY sp."id" ORDER BY "revenue" DESC`,
        [id, from, now],
      ),
      this.query(
        `SELECT b."customer_phone" AS "phone", MAX(b."customer_name") AS "name",
             COUNT(*)::int AS "visits", SUM(${EARNED})::int AS "revenue",
             to_char(MAX(${LOCAL}), 'YYYY-MM-DD') AS "lastVisit",
             NOT EXISTS (
               SELECT 1 FROM "bookings" e
               WHERE e."business_id" = $1 AND e."customer_phone" = b."customer_phone"
                 AND e."status" = 'confirmed' AND e."outcome" IS DISTINCT FROM 'no_show' AND e."starts_at" < $2
             ) AS "isNew"
           FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           WHERE b."business_id" = $1 AND ${DONE}
             AND b."starts_at" >= $2 AND b."starts_at" < $3
           GROUP BY b."customer_phone" ORDER BY "revenue" DESC, "visits" DESC`,
        [id, from, now],
      ),
      this.query(
        `SELECT (EXTRACT(ISODOW FROM ${LOCAL})::int - 1) AS "weekday",
             EXTRACT(HOUR FROM ${LOCAL})::int AS "hour", COUNT(*)::int AS "visits"
           FROM "bookings" b
           WHERE b."business_id" = $1 AND ${DONE}
             AND b."starts_at" >= $2 AND b."starts_at" < $3
           GROUP BY 1, 2`,
        [id, from, now],
      ),
      this.query(
        `SELECT COUNT(*)::int AS "visits", COALESCE(SUM(${PRICE}), 0)::int AS "revenue"
           FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           WHERE b."business_id" = $1 AND b."status" = 'confirmed'
             AND b."starts_at" >= $2 AND b."starts_at" < $3`,
        [id, now, new Date(now.getTime() + days * 24 * 60 * 60_000)],
      ),
      this.query(
        `SELECT "weekday", "opens_minutes" AS "opens", "closes_minutes" AS "closes"
           FROM "working_hours" WHERE "business_id" = $1`,
        [id],
      ),
      this.insights(business, from, previousFrom, now),
    ])

    // Open minutes in the period, the same for every master: the base for their load.
    const openByWeekday = new Map(
      hours.map((row) => [toNumber(row.weekday), toNumber(row.closes) - toNumber(row.opens)]),
    )
    let openMinutes = 0
    for (let offset = 0; offset < days; offset += 1) {
      openMinutes += openByWeekday.get(weekdayOf(addDays(firstDay, offset))) ?? 0
    }

    const allClients = clients.map((row) => ({
      phone: String(row.phone),
      name: String(row.name ?? ''),
      visits: toNumber(row.visits),
      revenue: toNumber(row.revenue),
      lastVisit: String(row.lastVisit),
      isNew: Boolean(row.isNew),
    }))
    const newClients = allClients.filter((client) => client.isNew).length
    const averageCheck = current.visits === 0 ? 0 : Math.round(current.revenue / current.visits)
    const previousAverage =
      previous.visits === 0 ? 0 : Math.round(previous.revenue / previous.visits)
    const booked = current.visits + current.cancelled + current.noShows

    return {
      period: { days: days as AnalyticsDays, from: firstDay, to: today },
      totals: {
        revenue: current.revenue,
        revenueChange: change(current.revenue, previous.revenue),
        visits: current.visits,
        visitsChange: change(current.visits, previous.visits),
        averageCheck,
        averageCheckChange: change(averageCheck, previousAverage),
        clients: current.clients,
        newClients,
        returningClients: current.clients - newClients,
        cancellationRate: booked === 0 ? 0 : Math.round((current.cancelled / booked) * 100),
        noShows: current.noShows,
        noShowRate:
          current.visits + current.noShows === 0
            ? 0
            : Math.round((current.noShows / (current.visits + current.noShows)) * 100),
        payments: current.payments,
        // What the visits used from the stock (written off when marked «Пришёл»).
        materialsCost: current.materialsCost,
        margin: current.revenue - current.materialsCost,
        upcomingVisits: toNumber(upcoming[0]?.visits),
        upcomingRevenue: toNumber(upcoming[0]?.revenue),
      },
      daily: this.fillDays(firstDay, days, daily),
      // The same days one period back, so charts can lay the two side by side.
      previousDaily: this.fillDays(addDays(firstDay, -days), days, previousDaily),
      services: services.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        visits: toNumber(row.visits),
        revenue: toNumber(row.revenue),
        materialsCost: toNumber(row.materialsCost),
      })),
      masters: masters.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        role: String(row.role ?? ''),
        visits: toNumber(row.visits),
        revenue: toNumber(row.revenue),
        // What clients said about this master in the period.
        reviews: toNumber(row.reviews),
        rating: row.rating === null ? null : toNumber(row.rating),
        percent: row.percent === null ? null : toNumber(row.percent),
        // What the master is owed for the period: their share of what their visits earned.
        payout:
          row.percent === null
            ? null
            : Math.round((toNumber(row.revenue) * toNumber(row.percent)) / 100),
        load:
          openMinutes === 0
            ? 0
            : Math.min(100, Math.round((toNumber(row.bookedMinutes) / openMinutes) * 100)),
        previousRevenue: insights.previousByMaster.get(String(row.id)) ?? 0,
        retention: insights.retentionByMaster.get(String(row.id)) ?? null,
        topServices: insights.topServices.get(String(row.id)) ?? [],
      })),
      clients: allClients.slice(0, 20),
      heatmap: heatmap.map((row) => ({
        weekday: toNumber(row.weekday),
        hour: toNumber(row.hour),
        visits: toNumber(row.visits),
      })),
      attention: insights.attention,
      losses: insights.losses,
      retention: insights.retention,
      sources: insights.sources,
      promotions: insights.promotions,
      loyalty: insights.loyalty,
      month: insights.month,
    }
  }

  /**
   * The parts that say what to do: what needs the owner now, money that did not come, who comes
   * back, where bookings come from, what promotions and loyalty brought, the month's goal.
   */
  private async insights(business: Business, from: Date, previousFrom: Date, now: Date) {
    const id = business.id
    const today = toBusinessParts(now).dateKey
    const tomorrow = addDays(today, 1)
    const monthStart = `${today.slice(0, 8)}01`
    const [year = 2000, month = 1, dayOfMonth = 1] = today.split('-').map(Number)
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const day = 24 * 60 * 60_000
    const retentionFrom = new Date(now.getTime() - 2 * RETURN_DAYS * day)
    const retentionTo = new Date(now.getTime() - RETURN_DAYS * day)

    const [
      previousMasters,
      topServices,
      retentionRows,
      unmarked,
      lapsed,
      tomorrowRows,
      lowStock,
      losses,
      repeatNoShows,
      sources,
      branches,
      promotions,
      loyalty,
      monthRows,
    ] = await Promise.all([
      this.query(
        `SELECT b."specialist_id" AS "id", COALESCE(SUM(${EARNED}), 0)::int AS "revenue"
           FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           WHERE b."business_id" = $1 AND ${DONE} AND b."starts_at" >= $2 AND b."starts_at" < $3
           GROUP BY 1`,
        [id, previousFrom, from],
      ),
      this.query(
        `SELECT "id", "name", "visits" FROM (
           SELECT b."specialist_id" AS "id", s."name", COUNT(*)::int AS "visits",
             row_number() OVER (PARTITION BY b."specialist_id" ORDER BY COUNT(*) DESC, s."name") AS "place"
           FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           WHERE b."business_id" = $1 AND ${DONE} AND b."starts_at" >= $2 AND b."starts_at" < $3
           GROUP BY b."specialist_id", s."name"
         ) t WHERE "place" <= 3 ORDER BY "id", "place"`,
        [id, from, now],
      ),
      // Each client's first visit in the window, and whether they came again within RETURN_DAYS
      // (anywhere here, and to the same master).
      this.query(
        `WITH first AS (
           SELECT DISTINCT ON (b."customer_phone") b."customer_phone" AS "phone",
             b."specialist_id" AS "master", b."starts_at" AS "at"
           FROM "bookings" b
           WHERE b."business_id" = $1 AND ${DONE} AND b."starts_at" >= $2 AND b."starts_at" < $3
           ORDER BY b."customer_phone", b."starts_at"
         )
         SELECT f."master", COUNT(*)::int AS "clients",
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM "bookings" n WHERE n."business_id" = $1 AND n."customer_phone" = f."phone"
               AND n."status" = 'confirmed' AND n."outcome" IS DISTINCT FROM 'no_show'
               AND n."starts_at" > f."at" AND n."starts_at" <= f."at" + make_interval(days => $4)
           ))::int AS "returned",
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM "bookings" n WHERE n."business_id" = $1 AND n."customer_phone" = f."phone"
               AND n."specialist_id" = f."master"
               AND n."status" = 'confirmed' AND n."outcome" IS DISTINCT FROM 'no_show'
               AND n."starts_at" > f."at" AND n."starts_at" <= f."at" + make_interval(days => $4)
           ))::int AS "returnedToMaster"
         FROM first f GROUP BY f."master"`,
        [id, retentionFrom, retentionTo, RETURN_DAYS],
      ),
      this.query(
        `SELECT COUNT(*)::int AS "count", to_char(MIN(${LOCAL}), 'YYYY-MM-DD') AS "firstDate"
           FROM "bookings" b
           WHERE b."business_id" = $1 AND b."status" = 'confirmed' AND b."outcome" IS NULL
             AND b."ends_at" < $2 AND b."starts_at" >= $3`,
        [id, now, new Date(now.getTime() - 30 * day)],
      ),
      this.mailings.preview(id, 'lapsed', LAPSED_DAYS),
      this.query(
        `SELECT
           (SELECT "closes_minutes" - "opens_minutes" FROM "working_hours"
              WHERE "business_id" = $1 AND "weekday" = $4) AS "open",
           (SELECT COUNT(*) FROM "specialists" WHERE "business_id" = $1 AND "is_active")::int AS "masters",
           (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (b."ends_at" - b."starts_at")) / 60), 0)::int
              FROM "bookings" b WHERE b."business_id" = $1 AND b."status" = 'confirmed'
                AND b."starts_at" >= $2 AND b."starts_at" < $3) AS "booked"`,
        [
          id,
          businessDateTimeToUtc(tomorrow, 0),
          businessDateTimeToUtc(tomorrow, 24 * 60),
          weekdayOf(tomorrow),
        ],
      ),
      this.query(
        `SELECT "name" FROM "stock_items"
           WHERE "business_id" = $1 AND "min_quantity" IS NOT NULL AND "quantity" <= "min_quantity"
           ORDER BY "quantity" / NULLIF("min_quantity", 0), "name"`,
        [id],
      ),
      this.query(
        `SELECT
           COUNT(*) FILTER (WHERE b."outcome" = 'no_show')::int AS "noShows",
           COALESCE(SUM(${PRICE}) FILTER (WHERE b."outcome" = 'no_show'), 0)::int AS "noShowAmount",
           COUNT(*) FILTER (WHERE ${LATE})::int AS "late",
           COALESCE(SUM(${PRICE}) FILTER (WHERE ${LATE}), 0)::int AS "lateAmount"
         FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
         WHERE b."business_id" = $1 AND b."starts_at" >= $2 AND b."starts_at" < $3`,
        [id, from, now],
      ),
      this.query(
        `SELECT b."customer_phone" AS "phone", MAX(b."customer_name") AS "name", COUNT(*)::int AS "count"
           FROM "bookings" b
           WHERE b."business_id" = $1 AND b."status" = 'confirmed' AND b."outcome" = 'no_show'
             AND b."starts_at" >= $2
           GROUP BY 1 HAVING COUNT(*) >= 2 ORDER BY 3 DESC, 2 LIMIT 10`,
        [id, new Date(now.getTime() - 182 * day)],
      ),
      this.query(
        `SELECT b."source", COUNT(*)::int AS "visits"
           FROM "bookings" b
           WHERE b."business_id" = $1 AND ${DONE} AND b."starts_at" >= $2 AND b."starts_at" < $3
           GROUP BY 1`,
        [id, from, now],
      ),
      this.query(
        `SELECT br."id", br."name", COUNT(b."id")::int AS "visits",
             COALESCE(SUM(${EARNED}), 0)::int AS "revenue"
           FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           JOIN "branches" br ON br."id" = b."branch_id"
           WHERE b."business_id" = $1 AND ${DONE} AND b."starts_at" >= $2 AND b."starts_at" < $3
           GROUP BY br."id", br."name" ORDER BY "revenue" DESC`,
        [id, from, now],
      ),
      this.query(
        `SELECT p."id", p."title", COUNT(b."id")::int AS "visits",
             COALESCE(SUM(${EARNED}), 0)::int AS "revenue",
             COALESCE(SUM(b."discount_amount"), 0)::int AS "discount"
           FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           JOIN "promotions" p ON p."id" = b."promotion_id"
           WHERE b."business_id" = $1 AND ${DONE} AND b."starts_at" >= $2 AND b."starts_at" < $3
           GROUP BY p."id", p."title" ORDER BY "revenue" DESC`,
        [id, from, now],
      ),
      this.query(
        `SELECT
           (SELECT COALESCE(SUM(ABS(t."amount")), 0) FROM "bonus_transactions" t
              WHERE t."business_id" = $1 AND t."kind" = 'spend'
                AND t."created_at" >= $2 AND t."created_at" < $3)::int AS "bonusSpent",
           (SELECT COALESCE(SUM(u."amount"), 0) FROM "certificate_uses" u
              JOIN "gift_certificates" g ON g."id" = u."certificate_id"
              WHERE g."business_id" = $1 AND u."created_at" >= $2 AND u."created_at" < $3)::int
             AS "certificateSpent",
           (SELECT COUNT(*) FROM "subscription_uses" u
              JOIN "client_subscriptions" c ON c."id" = u."subscription_id"
              WHERE c."business_id" = $1 AND u."created_at" >= $2 AND u."created_at" < $3)::int
             AS "subscriptionVisits"`,
        [id, from, now],
      ),
      this.query(
        `SELECT COALESCE(SUM(${EARNED}), 0)::int AS "revenue"
           FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           WHERE b."business_id" = $1 AND ${DONE} AND b."starts_at" >= $2 AND b."starts_at" < $3`,
        [id, businessDateTimeToUtc(monthStart, 0), now],
      ),
    ])

    const retentionByMaster = new Map<string, number | null>()
    let retentionClients = 0
    let retentionReturned = 0
    for (const row of retentionRows) {
      const clients = toNumber(row.clients)
      retentionClients += clients
      retentionReturned += toNumber(row.returned)
      // Under three clients a share says nothing.
      retentionByMaster.set(
        String(row.master),
        clients < 3 ? null : Math.round((toNumber(row.returnedToMaster) / clients) * 100),
      )
    }
    const topByMaster = new Map<string, { name: string; visits: number }[]>()
    for (const row of topServices) {
      const list = topByMaster.get(String(row.id)) ?? []
      list.push({ name: String(row.name), visits: toNumber(row.visits) })
      topByMaster.set(String(row.id), list)
    }
    const tomorrowRow = tomorrowRows[0]
    const open =
      tomorrowRow?.open === null || tomorrowRow?.open === undefined
        ? null
        : toNumber(tomorrowRow.open)
    const bySource = new Map(sources.map((row) => [String(row.source), toNumber(row.visits)]))
    const monthRevenue = toNumber(monthRows[0]?.revenue)
    const loss = losses[0]
    const bonus = loyalty[0]

    return {
      previousByMaster: new Map(
        previousMasters.map((row) => [String(row.id), toNumber(row.revenue)]),
      ),
      retentionByMaster,
      topServices: topByMaster,
      attention: {
        unmarked: {
          count: toNumber(unmarked[0]?.count),
          firstDate: (unmarked[0]?.firstDate as string | null) ?? null,
        },
        lapsed: { count: lapsed.count, days: LAPSED_DAYS },
        freeTomorrow:
          open === null || open <= 0
            ? null
            : {
                minutes: Math.max(
                  0,
                  open * toNumber(tomorrowRow?.masters) - toNumber(tomorrowRow?.booked),
                ),
                date: tomorrow,
              },
        lowStock: {
          count: lowStock.length,
          names: lowStock.slice(0, 3).map((row) => String(row.name)),
        },
      },
      losses: {
        noShows: { count: toNumber(loss?.noShows), amount: toNumber(loss?.noShowAmount) },
        lateCancellations: { count: toNumber(loss?.late), amount: toNumber(loss?.lateAmount) },
        repeatNoShows: repeatNoShows.map((row) => ({
          phone: String(row.phone),
          name: String(row.name ?? ''),
          count: toNumber(row.count),
        })),
      },
      retention: {
        days: RETURN_DAYS,
        clients: retentionClients,
        returned: retentionReturned,
        rate:
          retentionClients < 3 ? null : Math.round((retentionReturned / retentionClients) * 100),
      },
      sources: {
        online: bySource.get('online') ?? 0,
        staff: bySource.get('staff') ?? 0,
        import: bySource.get('import') ?? 0,
        branches: branches.map((row) => ({
          id: String(row.id),
          name: String(row.name),
          visits: toNumber(row.visits),
          revenue: toNumber(row.revenue),
        })),
      },
      promotions: promotions.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        visits: toNumber(row.visits),
        revenue: toNumber(row.revenue),
        discount: toNumber(row.discount),
      })),
      loyalty: {
        bonusSpent: toNumber(bonus?.bonusSpent),
        certificateSpent: toNumber(bonus?.certificateSpent),
        subscriptionVisits: toNumber(bonus?.subscriptionVisits),
      },
      month: {
        label: MONTHS[month - 1] ?? '',
        revenue: monthRevenue,
        goal: business.revenueGoal ?? null,
        // The month so far at this pace, to its end.
        projected: Math.round((monthRevenue / dayOfMonth) * daysInMonth),
        daysLeft: daysInMonth - dayOfMonth,
      },
    }
  }

  private async totals(businessId: string, from: Date, to: Date): Promise<Totals> {
    const [row] = await this.query(
      `SELECT COUNT(*) FILTER (WHERE ${DONE})::int AS "visits",
         COALESCE(SUM(${EARNED}) FILTER (WHERE ${DONE}), 0)::int AS "revenue",
         COUNT(*) FILTER (WHERE b."status" = 'cancelled')::int AS "cancelled",
         COUNT(DISTINCT b."customer_phone") FILTER (WHERE ${DONE})::int AS "clients",
         COUNT(*) FILTER (WHERE b."status" = 'confirmed' AND b."outcome" = 'no_show')::int AS "noShows",
         COALESCE(SUM(b."paid_amount") FILTER (WHERE b."payment_method" = 'cash'), 0)::int AS "cash",
         COALESCE(SUM(b."paid_amount") FILTER (WHERE b."payment_method" = 'card'), 0)::int AS "card",
         COALESCE(SUM(b."paid_amount") FILTER (WHERE b."payment_method" = 'transfer'), 0)::int AS "transfer",
         COALESCE(SUM(${PRICE}) FILTER (WHERE ${DONE} AND b."outcome" IS NULL), 0)::int AS "unmarked",
         COALESCE(SUM(${MATERIALS}) FILTER (WHERE ${DONE}), 0)::int AS "materialsCost"
       FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
       WHERE b."business_id" = $1 AND b."starts_at" >= $2 AND b."starts_at" < $3`,
      [businessId, from, to],
    )

    return {
      visits: toNumber(row?.visits),
      revenue: toNumber(row?.revenue),
      cancelled: toNumber(row?.cancelled),
      clients: toNumber(row?.clients),
      noShows: toNumber(row?.noShows),
      materialsCost: toNumber(row?.materialsCost),
      payments: {
        cash: toNumber(row?.cash),
        card: toNumber(row?.card),
        transfer: toNumber(row?.transfer),
        unmarked: toNumber(row?.unmarked),
      },
    }
  }

  // Every day of the period, including days without visits, so the chart has no gaps.
  private daily(id: string, from: Date, to: Date) {
    return this.query(
      `SELECT to_char(${LOCAL}::date, 'YYYY-MM-DD') AS "date",
         COUNT(*) FILTER (WHERE ${DONE})::int AS "visits",
         COALESCE(SUM(${EARNED}) FILTER (WHERE ${DONE}), 0)::int AS "revenue",
         COUNT(*) FILTER (WHERE b."status" = 'cancelled')::int AS "cancelled"
       FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
       WHERE b."business_id" = $1 AND b."starts_at" >= $2 AND b."starts_at" < $3
       GROUP BY 1 ORDER BY 1`,
      [id, from, to],
    )
  }

  private fillDays(firstDay: string, days: number, rows: Record<string, unknown>[]) {
    const byDate = new Map(rows.map((row) => [String(row.date), row]))

    return Array.from({ length: days }, (_, offset) => {
      const date = addDays(firstDay, offset)
      const row = byDate.get(date)
      return {
        date,
        visits: toNumber(row?.visits),
        revenue: toNumber(row?.revenue),
        cancelled: toNumber(row?.cancelled),
      }
    })
  }

  /**
   * «За неделю» on the owner's page: devices that opened it (the `business` funnel step) and
   * online bookings made, over `days` and the same stretch before.
   */
  async pageStats(business: Business, days: number): Promise<PageStats> {
    const [row] = await this.query(
      `SELECT
         (SELECT COUNT(DISTINCT "session") FROM "funnel_events"
           WHERE "slug" = $1 AND "step" = 'business'
             AND "created_at" >= now() - make_interval(days => $3))::int AS "views",
         (SELECT COUNT(DISTINCT "session") FROM "funnel_events"
           WHERE "slug" = $1 AND "step" = 'business'
             AND "created_at" >= now() - make_interval(days => $3 * 2)
             AND "created_at" < now() - make_interval(days => $3))::int AS "previousViews",
         (SELECT COUNT(*) FROM "bookings"
           WHERE "business_id" = $2 AND "source" = 'online' AND "status" = 'confirmed'
             AND "created_at" >= now() - make_interval(days => $3))::int AS "bookings",
         (SELECT COUNT(*) FROM "bookings"
           WHERE "business_id" = $2 AND "source" = 'online' AND "status" = 'confirmed'
             AND "created_at" >= now() - make_interval(days => $3 * 2)
             AND "created_at" < now() - make_interval(days => $3))::int AS "previousBookings"`,
      [business.slug, business.id, days],
    )
    return {
      days,
      views: toNumber(row?.views),
      bookings: toNumber(row?.bookings),
      previousViews: toNumber(row?.previousViews),
      previousBookings: toNumber(row?.previousBookings),
    }
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Record<string, unknown>[]>
  }
}
