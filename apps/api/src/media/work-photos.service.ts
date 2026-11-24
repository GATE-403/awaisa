import type { BusinessKind } from '@awaisa/contracts'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { returnedRows } from '../common/sql.js'
import type { FeedQuery, UpdateWorkPhotoInput } from './work-photos.schemas.js'

type Row = Record<string, unknown>

const MAX_PHOTOS = 30
const FEED_PAGE = 12

/** The owner's order; photos never arranged (null) first, newest first. */
const BY_PLACE = 'w."position" ASC NULLS FIRST, w."created_at" DESC'

const text = (value: unknown) => (value === null || value === undefined ? null : String(value))

/**
 * Photos of finished work. Each may name the service and the master, so the 'Works' feed can
 * book exactly that from the photo; the business page shows the visible ones as 'Works'.
 */
@Injectable()
export class WorkPhotosService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listForBusiness(businessId: string) {
    const rows = await this.query(
      `SELECT w."id", w."url", w."service_id" AS "serviceId", w."specialist_id" AS "specialistId",
         w."is_hidden" AS "isHidden", w."reports", w."created_at" AS "createdAt",
         s."name" AS "serviceName", sp."name" AS "specialistName"
       FROM "work_photos" w
       LEFT JOIN "services" s ON s."id" = w."service_id"
       LEFT JOIN "specialists" sp ON sp."id" = w."specialist_id"
       WHERE w."business_id" = $1 ORDER BY ${BY_PLACE}`,
      [businessId],
    )
    return rows.map((row) => ({
      id: String(row.id),
      url: String(row.url),
      serviceId: text(row.serviceId),
      serviceName: text(row.serviceName),
      specialistId: text(row.specialistId),
      specialistName: text(row.specialistName),
      isHidden: Boolean(row.isHidden),
      reports: Number(row.reports),
      createdAt: new Date(row.createdAt as string).toISOString(),
    }))
  }

  async assertRoom(businessId: string) {
    const [row] = await this.query(
      'SELECT COUNT(*)::int AS "count" FROM "work_photos" WHERE "business_id" = $1',
      [businessId],
    )
    if (Number(row?.count) >= MAX_PHOTOS) {
      throw new BadRequestException(`Up to ${MAX_PHOTOS} work photos, delete some old ones`)
    }
  }

  async add(
    businessId: string,
    url: string,
    tags: {
      serviceId?: string | null
      specialistId?: string | null
      bookingId?: string | null
      isFromClient?: boolean
    },
  ) {
    await this.assertTags(businessId, tags.serviceId ?? null, tags.specialistId ?? null)
    await this.query(
      `INSERT INTO "work_photos" ("business_id", "url", "service_id", "specialist_id", "booking_id", "is_from_client")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        businessId,
        url,
        tags.serviceId ?? null,
        tags.specialistId ?? null,
        tags.bookingId ?? null,
        tags.isFromClient ?? false,
      ],
    )
  }

  /**
   * Photos of visits come by themselves, one per visit, so a full place keeps the newest: the
   * oldest visit photo the owner never put in order makes room. Returns its file when nothing
   * else shows it, for the caller to delete; refuses as before when only the owner's own remain.
   */
  async makeRoomForVisit(businessId: string) {
    if (await this.hasRoom(businessId)) return null
    const [oldest] = await this.query(
      `SELECT "id" FROM "work_photos"
       WHERE "business_id" = $1 AND "booking_id" IS NOT NULL AND "position" IS NULL
       ORDER BY "created_at" LIMIT 1`,
      [businessId],
    )
    if (!oldest) await this.assertRoom(businessId)
    return oldest ? this.remove(businessId, String(oldest.id)) : null
  }

  async update(businessId: string, id: string, input: UpdateWorkPhotoInput) {
    await this.assertTags(businessId, input.serviceId, input.specialistId)
    const [current] = await this.query(
      'SELECT "is_moderated" AS "isModerated" FROM "work_photos" WHERE "id" = $1 AND "business_id" = $2',
      [id, businessId],
    )
    if (current?.isModerated && !input.isHidden) {
      throw new BadRequestException(
        'This photo was hidden by an Awaisa moderator and cannot be shown again',
      )
    }
    const rows = await this.query(
      `UPDATE "work_photos" SET "service_id" = $3, "specialist_id" = $4, "is_hidden" = $5,
         -- Shown again by the owner: past reports are settled.
         "reports" = CASE WHEN $5 THEN "reports" ELSE 0 END
       WHERE "id" = $1 AND "business_id" = $2 RETURNING "id"`,
      [id, businessId, input.serviceId, input.specialistId, input.isHidden],
    )
    if (returnedRows(rows).length === 0) throw new NotFoundException('Photo not found')
    if (!input.isHidden) {
      // Shown again by the owner: the reports so far are settled for the moderators too.
      await this.query(
        `UPDATE "reports" SET "resolved_at" = now()
         WHERE "target_type" = 'photo' AND "target_id" = $1 AND "resolved_at" IS NULL`,
        [id],
      )
    }
  }

  /** The owner's order of every photo of the place: `ids` first to last; others keep theirs. */
  async reorder(businessId: string, ids: string[]) {
    await this.query(
      `UPDATE "work_photos" w SET "position" = o."position"
       FROM unnest($2::uuid[]) WITH ORDINALITY AS o("id", "position")
       WHERE w."id" = o."id" AND w."business_id" = $1`,
      [businessId, ids],
    )
  }

  /**
   * Removes the row and returns its URL for the storage - or null when a client's review still
   * shows the same file (review photos are added to 'Works' without a copy).
   */
  async remove(businessId: string, id: string) {
    const rows = await this.query(
      `DELETE FROM "work_photos" WHERE "id" = $1 AND "business_id" = $2 RETURNING "url"`,
      [id, businessId],
    )
    const [row] = returnedRows(rows)
    if (!row) throw new NotFoundException('Photo not found')
    // Nothing left to moderate: its reports leave the queue.
    await this.query(
      `UPDATE "reports" SET "resolved_at" = now()
       WHERE "target_type" = 'photo' AND "target_id" = $1 AND "resolved_at" IS NULL`,
      [id],
    )
    const url = String(row.url)
    const [used] = await this.query('SELECT 1 FROM "review_photos" WHERE "url" = $1 LIMIT 1', [url])
    return used ? null : url
  }

  /** Whether there is room for one more, without refusing - for photos that only may go here. */
  async hasRoom(businessId: string) {
    const [row] = await this.query(
      'SELECT COUNT(*)::int AS "count" FROM "work_photos" WHERE "business_id" = $1',
      [businessId],
    )
    return Number(row?.count) < MAX_PHOTOS
  }

  /** One like per photo and device session; returns the photo's count either way. */
  async like(id: string, session: string, isLiked: boolean) {
    const rows = isLiked
      ? await this.query(
          `WITH added AS (
             INSERT INTO "work_photo_likes" ("photo_id", "session") VALUES ($1, $2)
             ON CONFLICT DO NOTHING RETURNING 1
           )
           UPDATE "work_photos" SET "likes" = "likes" + (SELECT COUNT(*) FROM added)
           WHERE "id" = $1 RETURNING "likes"`,
          [id, session],
        )
      : await this.query(
          `WITH removed AS (
             DELETE FROM "work_photo_likes" WHERE "photo_id" = $1 AND "session" = $2 RETURNING 1
           )
           UPDATE "work_photos" SET "likes" = GREATEST(0, "likes" - (SELECT COUNT(*) FROM removed))
           WHERE "id" = $1 RETURNING "likes"`,
          [id, session],
        )
    const [row] = returnedRows(rows)
    if (!row) throw new NotFoundException('Photo not found')
    return { likes: Number(row.likes) }
  }

  /**
   * The feed: visible photos of published businesses, newest first - or nearest first (by 3 km
   * rings, newest inside a ring) when the viewer shared a location. `start` puts one photo on
   * top (the one tapped on a business page); `business` keeps to one place.
   */
  async feed(query: FeedQuery) {
    const hasPoint = query.lat !== undefined && query.lng !== undefined
    const rows = await this.query(
      `WITH nearest AS (
         SELECT br."business_id", MIN(
           6371 * 2 * ASIN(SQRT(
             POWER(SIN(RADIANS(br."latitude" - $1) / 2), 2) +
             COS(RADIANS($1)) * COS(RADIANS(br."latitude")) * POWER(SIN(RADIANS(br."longitude" - $2) / 2), 2)
           ))) AS "km"
         FROM "branches" br
         WHERE $1::float8 IS NOT NULL AND br."is_active" AND br."latitude" IS NOT NULL
         GROUP BY br."business_id"
       )
       SELECT w."id", w."url", w."created_at" AS "createdAt",
         b."slug", b."name" AS "businessName", b."kind", b."address",
         s."id" AS "serviceId", s."name" AS "serviceName", s."price", s."duration_minutes" AS "duration",
         sp."id" AS "specialistId", sp."name" AS "specialistName", sp."photo_url" AS "specialistPhoto",
         n."km", w."likes", w."is_from_client" AS "isFromClient",
         -- What people said about this very service with this master (or the service at the place).
         (SELECT COUNT(*)::int FROM "reviews" r
           WHERE r."business_id" = b."id" AND r."service_id" = w."service_id"
             AND (w."specialist_id" IS NULL OR r."specialist_id" = w."specialist_id")) AS "reviewsCount"
       FROM "work_photos" w
       JOIN "businesses" b ON b."id" = w."business_id" AND b."is_published"
       LEFT JOIN "services" s ON s."id" = w."service_id" AND s."is_active"
       LEFT JOIN "specialists" sp ON sp."id" = w."specialist_id" AND sp."is_active"
       LEFT JOIN nearest n ON n."business_id" = b."id"
       WHERE NOT w."is_hidden"
         AND ($3::text IS NULL OR b."kind" = $3)
         AND ($4::text IS NULL OR b."slug" = $4)
       ORDER BY (w."id" = $5::uuid) IS TRUE DESC,
         ${hasPoint ? 'FLOOR(n."km" / 3) ASC NULLS LAST,' : ''}
         w."created_at" DESC, w."id"
       LIMIT ${FEED_PAGE} OFFSET $6`,
      [
        query.lat ?? null,
        query.lng ?? null,
        query.kind ?? null,
        query.business ?? null,
        query.start ?? null,
        query.offset,
      ],
    )
    const items = rows.map((row) => ({
      id: String(row.id),
      url: String(row.url),
      createdAt: new Date(row.createdAt as string).toISOString(),
      business: {
        slug: String(row.slug),
        name: String(row.businessName),
        kind: String(row.kind) as BusinessKind,
        address: String(row.address ?? ''),
      },
      service: row.serviceId
        ? {
            id: String(row.serviceId),
            name: String(row.serviceName),
            price: Number(row.price),
            durationMinutes: Number(row.duration),
          }
        : null,
      specialist: row.specialistId
        ? {
            id: String(row.specialistId),
            name: String(row.specialistName),
            photoUrl: text(row.specialistPhoto),
          }
        : null,
      distanceKm:
        row.km === null || row.km === undefined ? null : Math.round(Number(row.km) * 10) / 10,
      likes: Number(row.likes ?? 0),
      isFromClient: Boolean(row.isFromClient),
      reviewsCount: row.serviceId ? Number(row.reviewsCount ?? 0) : 0,
    }))
    return {
      items,
      nextOffset: items.length === FEED_PAGE ? query.offset + FEED_PAGE : null,
    }
  }

  private async assertTags(
    businessId: string,
    serviceId: string | null,
    specialistId: string | null,
  ) {
    if (serviceId) {
      const [service] = await this.query(
        'SELECT 1 FROM "services" WHERE "id" = $1 AND "business_id" = $2',
        [serviceId, businessId],
      )
      if (!service) throw new BadRequestException('Service not found')
    }
    if (specialistId) {
      const [master] = await this.query(
        'SELECT 1 FROM "specialists" WHERE "id" = $1 AND "business_id" = $2',
        [specialistId, businessId],
      )
      if (!master) throw new BadRequestException('Specialist not found')
    }
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
