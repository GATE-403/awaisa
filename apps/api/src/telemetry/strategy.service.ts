import type { BookingChannel, StrategyReport } from '@awaisa/contracts'
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { BUSINESS_UTC_OFFSET_MINUTES } from '../common/business-time.js'

// A client counts as returning when they book online again within this many days.
const REPEAT_WINDOW_DAYS = 60

const CHANNELS: BookingChannel[] = [
  'catalog',
  'for_you',
  'feed',
  'search',
  'map',
  'salon_link',
  'other',
]

const toNumber = (value: unknown) => Number(value ?? 0)

/**
 * The numbers that say whether the strategy works: businesses running their day in the cabinet,
 * where online bookings come from and whether clients book through Awaisa again.
 */
@Injectable()
export class StrategyService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async report(days: number): Promise<StrategyReport> {
    const [activeBusinesses, channels, repeat] = await Promise.all([
      this.activeBusinesses(days),
      this.channels(days),
      this.repeat(days),
    ])
    return { days, activeBusinesses, channels, repeat }
  }

  // Weeks start on Monday in Bishkek; an outcome marked (one visit or «Все пришли») is the sign.
  private async activeBusinesses(days: number) {
    const weeks = Math.max(1, Math.ceil(days / 7))
    const rows = (await this.dataSource.query(
      `WITH weeks AS (
         SELECT generate_series(
           date_trunc('week', now() + make_interval(mins => $2)) - make_interval(weeks => $1::int - 1),
           date_trunc('week', now() + make_interval(mins => $2)),
           interval '1 week'
         ) AS "week"
       )
       SELECT to_char(w."week", 'YYYY-MM-DD') AS "week",
         COUNT(DISTINCT b."business_id")::int AS "count"
       FROM weeks w
       LEFT JOIN "bookings" b
         ON b."outcome_at" + make_interval(mins => $2) >= w."week"
        AND b."outcome_at" + make_interval(mins => $2) < w."week" + interval '1 week'
       GROUP BY w."week" ORDER BY w."week"`,
      [weeks, BUSINESS_UTC_OFFSET_MINUTES],
    )) as { week: string; count: number }[]
    return rows.map((row) => ({ week: row.week, count: toNumber(row.count) }))
  }

  private async channels(days: number) {
    const rows = (await this.dataSource.query(
      `SELECT COALESCE("channel", 'other') AS "channel", COUNT(*)::int AS "bookings"
       FROM "bookings"
       WHERE "source" = 'online' AND "created_at" >= now() - make_interval(days => $1)
       GROUP BY 1`,
      [days],
    )) as { channel: BookingChannel; bookings: number }[]
    const counts = new Map(rows.map((row) => [row.channel, toNumber(row.bookings)]))
    return CHANNELS.map((channel) => ({ channel, bookings: counts.get(channel) ?? 0 }))
  }

  private async repeat(days: number) {
    const [row] = (await this.dataSource.query(
      `WITH firsts AS (
         SELECT "customer_phone", MIN("created_at") AS "first_at"
         FROM "bookings" WHERE "source" = 'online'
         GROUP BY 1
       ), cohort AS (
         SELECT * FROM firsts
         WHERE "first_at" >= now() - make_interval(days => $1::int + $2::int)
           AND "first_at" < now() - make_interval(days => $2)
       )
       SELECT COUNT(*)::int AS "clients",
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM "bookings" b
           WHERE b."source" = 'online' AND b."customer_phone" = c."customer_phone"
             AND b."created_at" > c."first_at"
             AND b."created_at" <= c."first_at" + make_interval(days => $2::int)
         ))::int AS "returned"
       FROM cohort c`,
      [days, REPEAT_WINDOW_DAYS],
    )) as { clients: number; returned: number }[]
    const clients = toNumber(row?.clients)
    const returned = toNumber(row?.returned)
    return {
      clients,
      returned,
      share: clients === 0 ? null : Math.round((returned / clients) * 1000) / 10,
    }
  }
}

export { REPEAT_WINDOW_DAYS }
