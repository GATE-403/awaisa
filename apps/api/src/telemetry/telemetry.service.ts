import type {
  FunnelReport,
  FunnelSegment,
  FunnelSegmentsReport,
  FunnelSignalsReport,
  FunnelStep,
} from '@awaisa/contracts'
import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { captureError } from '../runtime/sentry.js'
import { buildFunnel } from './funnel.js'
import {
  type ClientErrorInput,
  FUNNELS,
  type FunnelEventsInput,
  type FunnelReportQuery,
  STEP_FLOW,
} from './telemetry.schemas.js'

const KEEP_DAYS = 90

type ErrorReport = Omit<ClientErrorInput, 'stack' | 'url'> & {
  stack?: string
  url?: string
  userAgent?: string
}

// Device dimensions a report can be cut by, and their columns in "funnel_sessions".
const SEGMENT_COLUMNS = {
  type: 'device',
  os: 'os',
  app: 'app',
  textScale: 'text_scale',
  net: 'net',
} as const satisfies Record<keyof FunnelSegment, string>

/**
 * Where people drop out of each scenario, on which devices, and what breaks for them - kept in
 * our own database, no tracker in the browser. Errors are also sent, scrubbed, to Sentry when
 * SENTRY_DSN is set. Writes never fail a request: telemetry is best-effort.
 */
@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name)

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async recordSteps({ session, events, device }: FunnelEventsInput) {
    try {
      const values = events.map((_, index) => {
        const at = index * 4 + 2
        return `($1, $${at}, $${at + 1}, NULLIF($${at + 2}, ''), $${at + 3}::jsonb)`
      })
      await this.dataSource.query(
        `INSERT INTO "funnel_events" ("session", "step", "flow", "slug", "meta")
         VALUES ${values.join(', ')}`,
        [
          session,
          ...events.flatMap((event) => [
            event.step,
            STEP_FLOW.get(event.step) ?? 'booking',
            event.slug ?? '',
            event.meta && Object.keys(event.meta).length ? JSON.stringify(event.meta) : null,
          ]),
        ],
      )
      // One row per device, its latest settings: a font made bigger yesterday counts today.
      if (device)
        await this.dataSource.query(
          `INSERT INTO "funnel_sessions" ("session", "device", "os", "app", "text_scale", "net",
             "lang", "reduced_motion", "contrast_more", "dark", "updated_at")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
           ON CONFLICT ("session") DO UPDATE SET "device" = EXCLUDED."device",
             "os" = EXCLUDED."os", "app" = EXCLUDED."app", "text_scale" = EXCLUDED."text_scale",
             "net" = EXCLUDED."net", "lang" = EXCLUDED."lang",
             "reduced_motion" = EXCLUDED."reduced_motion",
             "contrast_more" = EXCLUDED."contrast_more", "dark" = EXCLUDED."dark",
             "updated_at" = now()`,
          [
            session,
            device.type,
            device.os,
            device.app,
            device.textScale,
            device.net,
            device.lang,
            device.reducedMotion,
            device.contrastMore,
            device.dark,
          ],
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

  /**
   * Distinct sessions per step of one flow over the last `days`, in the flow's order - for
   * everyone, or only the devices matching `segment` (phones with large text, slow networks…).
   */
  async funnel({ days, flow, ...filters }: FunnelReportQuery): Promise<FunnelReport> {
    const segment = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined),
    ) as FunnelSegment
    const conditions = ['e."created_at" > now() - make_interval(days => $1)', 'e."flow" = $2']
    const params: unknown[] = [days, flow]
    for (const [key, value] of Object.entries(segment)) {
      params.push(value)
      conditions.push(`s."${SEGMENT_COLUMNS[key as keyof FunnelSegment]}" = $${params.length}`)
    }
    const join = Object.keys(segment).length
      ? 'JOIN "funnel_sessions" s ON s."session" = e."session"'
      : ''
    const rows = (await this.dataSource.query(
      `SELECT e."step", COUNT(DISTINCT e."session")::int AS "sessions"
       FROM "funnel_events" e ${join}
       WHERE ${conditions.join(' AND ')}
       GROUP BY e."step"`,
      params,
    )) as { step: FunnelStep; sessions: number }[]

    return { days, flow, segment, steps: buildFunnel(rows, FUNNELS[flow]) }
  }

  /** Trouble signals: which fields people get wrong, which toast actions they use, and so on. */
  async signals(days: number): Promise<FunnelSignalsReport> {
    const rows = (await this.dataSource.query(
      `SELECT "step", COALESCE("meta"->>'field', "meta"->>'kind', "meta"->>'channel') AS "value",
         COUNT(*)::int AS "count", COUNT(DISTINCT "session")::int AS "sessions"
       FROM "funnel_events"
       WHERE "flow" = 'signals' AND "created_at" > now() - make_interval(days => $1)
       GROUP BY 1, 2 ORDER BY 4 DESC LIMIT 100`,
      [days],
    )) as FunnelSignalsReport['items']

    return { days, items: rows }
  }

  /** Who comes: how many devices of each kind were active in the period. */
  async segments(days: number): Promise<FunnelSegmentsReport> {
    const since = 'WHERE "updated_at" > now() - make_interval(days => $1)'
    const [{ sessions }] = (await this.dataSource.query(
      `SELECT COUNT(*)::int AS "sessions" FROM "funnel_sessions" ${since}`,
      [days],
    )) as { sessions: number }[]
    const items = (await this.dataSource.query(
      Object.entries(SEGMENT_COLUMNS)
        .map(
          ([dimension, column]) =>
            `SELECT '${dimension}' AS "dimension", "${column}" AS "value",
               COUNT(*)::int AS "sessions" FROM "funnel_sessions" ${since} GROUP BY 2`,
        )
        .join(' UNION ALL ')
        .concat(' ORDER BY 1, 3 DESC'),
      [days],
    )) as FunnelSegmentsReport['items']

    return { days, sessions, items }
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
    for (const [table, column] of [
      ['funnel_events', 'created_at'],
      ['funnel_sessions', 'updated_at'],
      ['app_errors', 'created_at'],
    ])
      await this.dataSource.query(
        `DELETE FROM "${table}" WHERE "${column}" < now() - make_interval(days => $1)`,
        [KEEP_DAYS],
      )
  }
}
