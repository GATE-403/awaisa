import { randomUUID } from 'node:crypto'
import type { BusinessKind } from '@awaisa/contracts'
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { AvailabilityService } from '../bookings/availability.service.js'
import { CacheService } from '../cache/cache.service.js'
import { addDays, toBusinessParts } from '../common/business-time.js'
import type { Customer } from '../customers/customer.entity.js'
import { RuntimeService } from '../runtime/runtime.service.js'
import { type BranchPoint, nearestByBusiness } from './distance.js'
import {
  type Affinities,
  ALGORITHM,
  type Candidate,
  computeAffinities,
  type Interest,
  type Profile,
  rankCandidates,
} from './recommend-score.js'
import type { RecommendationEventsInput, RecommendationsQuery } from './recommendations.schemas.js'

type Row = Record<string, unknown>

const CANDIDATES_KEY = 'recommendations:candidates:v1'
const CANDIDATES_TTL_SECONDS = 60
const NEXT_FREE_KEY = 'recommendations:next-free:v1'
const NEXT_FREE_TTL_SECONDS = 20

const CANDIDATES_SQL = `WITH demand AS (
         SELECT bk."service_id", COUNT(*)::int AS "count" FROM "bookings" bk
         WHERE bk."status" = 'confirmed' AND bk."starts_at" > now() - interval '30 days'
         GROUP BY bk."service_id"
       ),
       reviewed AS (
         SELECT r."business_id", COUNT(*)::int AS "count" FROM "reviews" r GROUP BY r."business_id"
       )
       SELECT s."id", s."name", s."price"::int AS "price", s."duration_minutes"::int AS "durationMinutes",
         s."is_popular" AS "isPopular", s."rebook_days" AS "rebookDays",
         b."slug", b."name" AS "businessName", b."kind", b."cover_url" AS "coverUrl",
        -- The newest visible work photo of this very service shows on its card when there is one.
        (SELECT wp."url" FROM "work_photos" wp
          WHERE wp."service_id" = s."id" AND NOT wp."is_hidden"
          ORDER BY wp."created_at" DESC LIMIT 1) AS "servicePhoto",
         (SELECT ROUND(AVG(sp."rating")::numeric, 1)::float8 FROM "specialists" sp
           WHERE sp."business_id" = b."id" AND sp."is_active" AND sp."rating" IS NOT NULL) AS "rating",
         (SELECT br."address" FROM "branches" br
           WHERE br."business_id" = b."id" AND br."is_active" ORDER BY br."position" LIMIT 1) AS "address",
         (SELECT MAX(p."percent")::int FROM "promotions" p
           WHERE p."business_id" = b."id" AND p."is_active" AND p."kind" <> 'promo_code'
             AND (p."service_ids" IS NULL OR s."id" = ANY(p."service_ids"))
             AND (p."ends_on" IS NULL OR p."ends_on" >= (now() AT TIME ZONE 'UTC' + interval '6 hours')::date)
             AND (p."starts_on" IS NULL OR p."starts_on" <= (now() AT TIME ZONE 'UTC' + interval '6 hours')::date)
         ) AS "discountPercent",
         COALESCE(d."count", 0) AS "demand", COALESCE(rv."count", 0) AS "reviews", b."id" AS "businessId"
       FROM "services" s
       JOIN "businesses" b ON b."id" = s."business_id" AND b."is_published"
       LEFT JOIN demand d ON d."service_id" = s."id"
       LEFT JOIN reviewed rv ON rv."business_id" = b."id"
       WHERE s."is_active"`

const DAY_MS = 86_400_000
const AFFINITY_TTL_MS = 10 * 60_000
// A place with fewer reviews than this is «new»: a shelf spot goes to such places.
const NEW_PLACE_REVIEWS = 5

/**
 * «Для вас»: every active service of a published place scored for this client — what they said
 * they like, what they booked and when, where they are, when the place is free, how good and
 * how booked it is. No accounts needed: guests send their answers and device visits.
 */
@Injectable()
export class RecommendationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RecommendationsService.name)
  private affinities: { value: Affinities; loadedAt: number } | null = null

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly availability: AvailabilityService,
    private readonly runtime: RuntimeService,
    private readonly cache: CacheService,
  ) {}

  // A fresh database gets its affinities at once instead of waiting for the night.
  onApplicationBootstrap() {
    if (!this.runtime.runsJobs) return
    void this.query('SELECT 1 FROM "kind_affinities" LIMIT 1')
      .then((rows) => (rows.length === 0 ? this.refreshAffinities() : undefined))
      .catch((error: unknown) => this.logger.warn(`Affinities not checked: ${String(error)}`))
  }

  /** Nightly at 03:00 business time: what clients book after what, from 180 days of visits. */
  @Cron('0 21 * * *')
  async refreshAffinities() {
    const rows = await this.query(
      `SELECT bk."customer_phone" AS "client", s."name" AS "serviceName", bk."starts_at" AS "startsAt"
       FROM "bookings" bk JOIN "services" s ON s."id" = bk."service_id"
       WHERE bk."status" = 'confirmed' AND bk."outcome" IS DISTINCT FROM 'no_show'
         AND bk."starts_at" > now() - interval '180 days' AND bk."starts_at" < now()`,
    )
    const pairs = computeAffinities(
      rows.map((row) => ({
        client: String(row.client),
        serviceName: String(row.serviceName),
        time: new Date(row.startsAt as string).getTime(),
      })),
    )
    await this.dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM "kind_affinities"')
      for (const pair of pairs) {
        await manager.query(
          'INSERT INTO "kind_affinities" ("from_kind", "to_kind", "lift", "support") VALUES ($1, $2, $3, $4)',
          [pair.from, pair.to, pair.lift, pair.support],
        )
      }
    })
    this.affinities = null
    this.logger.log(`Kind affinities: ${pairs.length} pairs from ${rows.length} visits`)
    return pairs.length
  }

  /** Shown, tapped and booked picks; never fails the page that sends them. */
  async recordEvents(input: RecommendationEventsInput, customer: Customer | null) {
    const values: unknown[] = []
    const tuples = input.events.map((event) => {
      const row = [
        input.session,
        customer?.id ?? null,
        event.kind,
        event.serviceId,
        event.reason,
        event.surface,
        event.position ?? null,
        event.requestId ?? null,
        event.algorithm ?? null,
        event.bookingId ?? null,
      ]
      const at = values.length
      values.push(...row)
      return `(${row.map((_, column) => `$${at + column + 1}`).join(', ')})`
    })
    await this.query(
      `INSERT INTO "recommendation_events"
         ("session", "customer_id", "kind", "service_id", "reason", "surface", "position",
          "request_id", "algorithm", "booking_id")
       VALUES ${tuples.join(', ')}`,
      values,
    )
    return { recorded: input.events.length }
  }

  /** Per reason: how often shown, tapped and booked — what actually brings bookings. */
  async stats(days: number) {
    const rows = await this.query(
      `SELECT "reason",
         COUNT(*) FILTER (WHERE "kind" = 'impression')::int AS "impressions",
         COUNT(*) FILTER (WHERE "kind" = 'click')::int AS "clicks",
         COUNT(*) FILTER (WHERE "kind" = 'book')::int AS "bookings"
       FROM "recommendation_events"
       WHERE "created_at" > now() - make_interval(days => $1)
       GROUP BY "reason" ORDER BY "impressions" DESC`,
      [days],
    )
    return rows.map((row) => {
      const impressions = Number(row.impressions)
      return {
        reason: String(row.reason) || '—',
        impressions,
        clicks: Number(row.clicks),
        bookings: Number(row.bookings),
        ctr: impressions ? Math.round((Number(row.clicks) / impressions) * 1000) / 10 : 0,
      }
    })
  }

  async recommend(query: RecommendationsQuery, customer: Customer | null) {
    const { rows, branches } = await this.loadCandidates()
    const hasPoint = query.lat !== undefined && query.lng !== undefined
    const nearest = hasPoint
      ? nearestByBusiness(branches, query.lat as number, query.lng as number)
      : new Map<string, number>()

    const slugs = [...new Set(rows.map((row) => String(row.slug)))].slice(0, 80)
    const [nextFree, visits, affinities, seen] = await Promise.all([
      this.loadNextFree(slugs),
      this.visitsOf(query.visits, customer),
      this.loadAffinities(),
      this.seenBy(query.session),
    ])
    const today = toBusinessParts(new Date()).dateKey
    const tomorrow = addDays(today, 1)

    const candidates = rows.map((row) => {
      const slot = nextFree[String(row.slug)] ?? null
      return {
        serviceId: String(row.id),
        name: String(row.name),
        price: Number(row.price),
        slug: String(row.slug),
        businessName: String(row.businessName),
        rating: row.rating === null ? null : Number(row.rating),
        reviews: Number(row.reviews),
        bookings30d: Number(row.demand),
        distanceKm: nearest.get(String(row.businessId)) ?? null,
        freeInDays: slot?.date === today ? 0 : slot?.date === tomorrow ? 1 : null,
        freeTime: slot?.time ?? null,
        discountPercent: row.discountPercent === null ? null : Number(row.discountPercent),
        rebookDays: row.rebookDays === null ? null : Number(row.rebookDays),
        isNewPlace: Number(row.reviews) < NEW_PLACE_REVIEWS,
        row,
      } satisfies Candidate & { row: Row }
    })

    const toRef = (candidate: Candidate) => ({
      serviceId: candidate.serviceId,
      name: candidate.name,
    })
    const focus = candidates.find((candidate) => candidate.serviceId === query.like)
    const recent = query.recent
      .map((id) => candidates.find((candidate) => candidate.serviceId === id))
      .filter((candidate) => candidate !== undefined && candidate !== focus)
      .map((candidate) => toRef(candidate as Candidate))
    const profile: Profile = {
      interests: query.interests as Interest[],
      gender: query.gender ?? null,
      budget: query.budget ?? null,
      visits,
      focus: focus ? toRef(focus) : null,
      recent,
      affinities,
      seen,
    }
    const requestId = randomUUID()
    return rankCandidates(candidates, profile, { limit: query.limit }).map(
      ({ candidate, reason }) => ({
        id: candidate.serviceId,
        name: candidate.name,
        price: candidate.price,
        durationMinutes: Number(candidate.row.durationMinutes),
        isPopular: Boolean(candidate.row.isPopular),
        slug: candidate.slug,
        businessName: candidate.businessName,
        kind: String(candidate.row.kind) as BusinessKind,
        coverUrl:
          (candidate.row.servicePhoto as string | null) ??
          (candidate.row.coverUrl as string | null) ??
          null,
        rating: candidate.rating,
        address: (candidate.row.address as string | null) ?? null,
        discountPercent: candidate.discountPercent,
        reason,
        requestId,
        algorithm: ALGORITHM,
      }),
    )
  }

  /**
   * Every active service of a published place with what scores it — the same for everyone, so
   * one copy is shared by all API instances for a minute (owners' edits bump `catalog`). It was
   * 55% of the database's time under load (load/README.md). Distances are worked out per request
   * from the branches' pins, since they depend on where the person is.
   */
  private loadCandidates() {
    return this.cache.remember(CANDIDATES_KEY, CANDIDATES_TTL_SECONDS, ['catalog'], async () => {
      const [rows, branches] = await Promise.all([
        this.query(CANDIDATES_SQL),
        this.query(
          `SELECT br."business_id" AS "businessId", br."latitude"::float8 AS "latitude",
             br."longitude"::float8 AS "longitude"
           FROM "branches" br WHERE br."is_active" AND br."latitude" IS NOT NULL`,
        ),
      ])
      return { rows, branches: branches as unknown as BranchPoint[] }
    })
  }

  // The first free times of the candidates' places: the same for everyone, like /next-free.
  private loadNextFree(slugs: string[]) {
    return this.cache.remember(
      `${NEXT_FREE_KEY}:${slugs.length}:${slugs.join(',').length}`,
      NEXT_FREE_TTL_SECONDS,
      ['availability'],
      () => this.availability.findNextFree(slugs),
    )
  }

  private async loadAffinities() {
    if (this.affinities && Date.now() - this.affinities.loadedAt < AFFINITY_TTL_MS) {
      return this.affinities.value
    }
    const rows = await this.query(
      'SELECT "from_kind" AS "from", "to_kind" AS "to", "lift" FROM "kind_affinities"',
    ).catch(() => [])
    const value: Affinities = {}
    for (const row of rows) {
      const from = row.from as Interest
      value[from] = { ...value[from], [row.to as Interest]: Number(row.lift) }
    }
    this.affinities = { value, loadedAt: Date.now() }
    return value
  }

  /** Services shown to this device in the last week and never tapped: how many times. */
  private async seenBy(session: string | undefined) {
    if (!session) return {}
    const rows = await this.query(
      `SELECT "service_id" AS "serviceId",
         COUNT(*) FILTER (WHERE "kind" = 'impression')::int AS "shown",
         COUNT(*) FILTER (WHERE "kind" <> 'impression')::int AS "tapped"
       FROM "recommendation_events"
       WHERE "session" = $1 AND "created_at" > now() - interval '7 days'
       GROUP BY "service_id"`,
      [session],
    ).catch(() => [])
    return Object.fromEntries(
      rows
        .filter((row) => Number(row.tapped) === 0)
        .map((row) => [String(row.serviceId), Number(row.shown)]),
    )
  }

  /** Device visits from the query plus, when signed in, the account's past visits. */
  private async visitsOf(raw: string[], customer: Customer | null) {
    const device = raw
      .map((entry) => {
        const [serviceId, date] = entry.split('~')
        const time = Date.parse(date ?? '')
        return serviceId && Number.isFinite(time) ? { serviceId, time } : null
      })
      .filter((entry): entry is { serviceId: string; time: number } => entry !== null)
    const account = customer
      ? await this.query(
          `SELECT bk."service_id" AS "serviceId", bk."starts_at" AS "startsAt" FROM "bookings" bk
           WHERE bk."customer_phone" = $1 AND bk."status" = 'confirmed' AND bk."starts_at" < now()
             AND bk."outcome" IS DISTINCT FROM 'no_show'
           ORDER BY bk."starts_at" DESC LIMIT 30`,
          [customer.phone],
        )
      : []
    const all = [
      ...device,
      ...account.map((row) => ({
        serviceId: String(row.serviceId),
        time: new Date(row.startsAt as string).getTime(),
      })),
    ]
    if (all.length === 0) return []
    const services = await this.query(
      `SELECT s."id", s."name", b."slug" FROM "services" s JOIN "businesses" b ON b."id" = s."business_id"
       WHERE s."id" = ANY($1)`,
      [[...new Set(all.map((visit) => visit.serviceId))]],
    )
    const byId = new Map(services.map((row) => [String(row.id), row]))
    const now = Date.now()
    return all
      .filter((visit) => byId.has(visit.serviceId) && visit.time < now)
      .map((visit) => ({
        serviceId: visit.serviceId,
        slug: String(byId.get(visit.serviceId)?.slug),
        serviceName: String(byId.get(visit.serviceId)?.name),
        daysAgo: Math.floor((now - visit.time) / DAY_MS),
      }))
  }

  private query(sql: string, params: unknown[] = []) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
