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

type Totals = {
  visits: number
  revenue: number
  cancelled: number
  clients: number
  noShows: number
  payments: { cash: number; card: number; transfer: number; unmarked: number }
}

// A visit counts unless the client did not show up; it earns what was paid, or the price
// when nobody marked the payment.
const DONE = `b."status" = 'confirmed' AND b."outcome" IS DISTINCT FROM 'no_show'`
const EARNED = `COALESCE(b."paid_amount", s."price")`

// Local business time (fixed UTC+6, see business-time.ts) for grouping by day and hour.
const LOCAL = `("b"."starts_at" AT TIME ZONE 'UTC' + interval '6 hours')`

const toNumber = (value: unknown) => Number(value ?? 0)

const change = (current: number, previous: number) =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 100)

// What an owner looks at in a booking system's reports: money, visits, clients, who is busy.
@Injectable()
export class AnalyticsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getReport(business: Business, days: number) {
    const now = new Date()
    const today = toBusinessParts(now).dateKey
    const firstDay = addDays(today, -(days - 1))
    const from = businessDateTimeToUtc(firstDay, 0)
    const previousFrom = businessDateTimeToUtc(addDays(firstDay, -days), 0)
    const id = business.id

    const [current, previous, daily, services, masters, clients, heatmap, upcoming, hours] =
      await Promise.all([
        this.totals(id, from, now),
        this.totals(id, previousFrom, from),
        this.query(
          `SELECT to_char(${LOCAL}::date, 'YYYY-MM-DD') AS "date",
             COUNT(*) FILTER (WHERE ${DONE})::int AS "visits",
             COALESCE(SUM(${EARNED}) FILTER (WHERE ${DONE}), 0)::int AS "revenue",
             COUNT(*) FILTER (WHERE b."status" = 'cancelled')::int AS "cancelled"
           FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           WHERE b."business_id" = $1 AND b."starts_at" >= $2 AND b."starts_at" < $3
           GROUP BY 1 ORDER BY 1`,
          [id, from, now],
        ),
        this.query(
          `SELECT s."id", s."name", COUNT(*)::int AS "visits", SUM(${EARNED})::int AS "revenue"
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
             COALESCE(SUM(s."duration_minutes") FILTER (WHERE ${DONE}), 0)::int AS "bookedMinutes"
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
          `SELECT COUNT(*)::int AS "visits", COALESCE(SUM(s."price"), 0)::int AS "revenue"
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
      period: { days, from: firstDay, to: today },
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
        upcomingVisits: toNumber(upcoming[0]?.visits),
        upcomingRevenue: toNumber(upcoming[0]?.revenue),
      },
      daily: this.fillDays(firstDay, days, daily),
      services: services.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        visits: toNumber(row.visits),
        revenue: toNumber(row.revenue),
      })),
      masters: masters.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        role: String(row.role ?? ''),
        visits: toNumber(row.visits),
        revenue: toNumber(row.revenue),
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
      })),
      clients: allClients.slice(0, 20),
      heatmap: heatmap.map((row) => ({
        weekday: toNumber(row.weekday),
        hour: toNumber(row.hour),
        visits: toNumber(row.visits),
      })),
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
         COALESCE(SUM(s."price") FILTER (WHERE ${DONE} AND b."outcome" IS NULL), 0)::int AS "unmarked"
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
      payments: {
        cash: toNumber(row?.cash),
        card: toNumber(row?.card),
        transfer: toNumber(row?.transfer),
        unmarked: toNumber(row?.unmarked),
      },
    }
  }

  // Every day of the period, including days without visits, so the chart has no gaps.
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

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Record<string, unknown>[]>
  }
}
