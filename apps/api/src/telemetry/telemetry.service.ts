import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { captureError } from '../runtime/sentry.js'
import { buildFunnel } from './funnel.js'
import type { ClientErrorInput, FunnelEventsInput, FunnelStep } from './telemetry.schemas.js'

const KEEP_DAYS = 90

type ErrorReport = Omit<ClientErrorInput, 'stack' | 'url'> & {
  stack?: string
  url?: string
  userAgent?: string
}

/**
 * Where people drop out of booking, and what breaks for them — kept in our own database, no
 * tracker in the browser. Errors are also sent, scrubbed, to Sentry when SENTRY_DSN is set.
 * Writes never fail a request: telemetry is best-effort.
 */
@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name)

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async recordSteps({ session, events }: FunnelEventsInput) {
    try {
      const values = events.map(
        (_, index) => `($1, $${index * 2 + 2}, NULLIF($${index * 2 + 3}, ''))`,
      )
      await this.dataSource.query(
        `INSERT INTO "funnel_events" ("session", "step", "slug") VALUES ${values.join(', ')}`,
        [session, ...events.flatMap((event) => [event.step, event.slug ?? ''])],
      )
    } catch (error) {
      this.logger.warn(`Funnel events lost: ${String(error)}`)
    }
  }

  async recordError(source: 'web' | 'api', error: ErrorReport) {
    captureError({ source, message: error.message, stack: error.stack, url: error.url })
    try {
      await this.dataSource.query(
        `INSERT INTO "app_errors" ("source", "message", "stack", "url", "session", "user_agent")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          source,
          error.message.slice(0, 500),
          (error.stack ?? '').slice(0, 4000),
          (error.url ?? '').slice(0, 500),
          error.session ?? null,
          (error.userAgent ?? '').slice(0, 300),
        ],
      )
    } catch (writeError) {
      this.logger.warn(`Error report lost: ${String(writeError)}`)
    }
  }

  /** Distinct sessions per step over the last `days`, in funnel order. */
  async funnel(days: number) {
    const rows = (await this.dataSource.query(
      `SELECT "step", COUNT(DISTINCT "session")::int AS "sessions"
       FROM "funnel_events" WHERE "created_at" > now() - make_interval(days => $1)
       GROUP BY "step"`,
      [days],
    )) as { step: FunnelStep; sessions: number }[]

    return { days, steps: buildFunnel(rows) }
  }

  /** The same error grouped: how often, for how many people, where and when last. */
  async errors(days: number) {
    const rows = (await this.dataSource.query(
      `SELECT "source", "message", COUNT(*)::int AS "count",
         COUNT(DISTINCT "session")::int AS "sessions", MAX("created_at") AS "lastSeen",
         (ARRAY_AGG("url" ORDER BY "created_at" DESC))[1] AS "url",
         (ARRAY_AGG("stack" ORDER BY "created_at" DESC))[1] AS "stack"
       FROM "app_errors" WHERE "created_at" > now() - make_interval(days => $1)
       GROUP BY "source", "message" ORDER BY COUNT(*) DESC LIMIT 50`,
      [days],
    )) as {
      source: string
      message: string
      count: number
      sessions: number
      lastSeen: Date
      url: string
      stack: string
    }[]

    return {
      days,
      items: rows.map((row) => ({ ...row, lastSeen: new Date(row.lastSeen).toISOString() })),
    }
  }

  // Nightly at 04:00 Bishkek (22:00 UTC): telemetry older than three months goes.
  @Cron('0 22 * * *')
  async prune() {
    await this.dataSource.query(
      'DELETE FROM "funnel_events" WHERE "created_at" < now() - make_interval(days => $1)',
      [KEEP_DAYS],
    )
    await this.dataSource.query(
      'DELETE FROM "app_errors" WHERE "created_at" < now() - make_interval(days => $1)',
      [KEEP_DAYS],
    )
  }
}
