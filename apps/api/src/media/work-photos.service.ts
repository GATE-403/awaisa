import type { BusinessKind } from '@awaisa/contracts'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { FeedQuery, UpdateWorkPhotoInput } from './work-photos.schemas.js'

type Row = Record<string, unknown>

const MAX_PHOTOS = 30
const FEED_PAGE = 12
/** Reports from different viewers that take a photo out of the feed until the owner looks. */
const REPORTS_TO_HIDE = 3

const text = (value: unknown) => (value === null || value === undefined ? null : String(value))

/**
 * Photos of finished work. Each may name the service and the master, so the «Работы» feed can
 * book exactly that from the photo; the business page shows the visible ones as «Работы».
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
       WHERE w."business_id" = $1 ORDER BY w."created_at" DESC`,
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
      throw new BadRequestException(`Можно до ${MAX_PHOTOS} фото работ — удалите старые`)
    }
  }

  async add(
    businessId: string,
    url: string,
    tags: { serviceId?: string | null; specialistId?: string | null; bookingId?: string | null },
  ) {
    await this.assertTags(businessId, tags.serviceId ?? null, tags.specialistId ?? null)
    await this.query(
      `INSERT INTO "work_photos" ("business_id", "url", "service_id", "specialist_id", "booking_id")
       VALUES ($1, $2, $3, $4, $5)`,
      [businessId, url, tags.serviceId ?? null, tags.specialistId ?? null, tags.bookingId ?? null],
    )
  }

  async update(businessId: string, id: string, input: UpdateWorkPhotoInput) {
    await this.assertTags(businessId, input.serviceId, input.specialistId)
    const rows = await this.query(
      `UPDATE "work_photos" SET "service_id" = $3, "specialist_id" = $4, "is_hidden" = $5,
         -- Shown again by the owner: past reports are settled.
         "reports" = CASE WHEN $5 THEN "reports" ELSE 0 END
       WHERE "id" = $1 AND "business_id" = $2 RETURNING "id"`,
      [id, businessId, input.serviceId, input.specialistId, input.isHidden],
    )
    if (this.rows(rows).length === 0) throw new NotFoundException('Фото не найдено')
  }

  /**
   * Removes the row and returns its URL for the storage — or null when a client's review still
   * shows the same file (review photos are added to «Работы» without a copy).
   */
  async remove(businessId: string, id: string) {
    const rows = await this.query(
      `DELETE FROM "work_photos" WHERE "id" = $1 AND "business_id" = $2 RETURNING "url"`,
      [id, businessId],
    )
    const [row] = this.rows(rows)
    if (!row) throw new NotFoundException('Фото не найдено')
    const url = String(row.url)
    const [used] = await this.query('SELECT 1 FROM "review_photos" WHERE "url" = $1 LIMIT 1', [url])
    return used ? null : url
  }

  /** Whether there is room for one more, without refusing — for photos that only may go here. */
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
    const [row] = this.rows(rows)
    if (!row) throw new NotFoundException('Фото не найдено')
    return { likes: Number(row.likes) }
  }

  async report(id: string) {
    const rows = await this.query(
      `UPDATE "work_photos" SET "reports" = "reports" + 1,
         "is_hidden" = "is_hidden" OR "reports" + 1 >= ${REPORTS_TO_HIDE}
       WHERE "id" = $1 RETURNING "id"`,
      [id],
    )
    if (this.rows(rows).length === 0) throw new NotFoundException('Фото не найдено')
  }

  /**
   * The feed: visible photos of published businesses, newest first — or nearest first (by 3 km
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
         n."km", w."likes",
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
      if (!service) throw new BadRequestException('Услуга не найдена')
    }
    if (specialistId) {
      const [master] = await this.query(
        'SELECT 1 FROM "specialists" WHERE "id" = $1 AND "business_id" = $2',
        [specialistId, businessId],
      )
      if (!master) throw new BadRequestException('Мастер не найден')
    }
  }

  // UPDATE/DELETE … RETURNING come back as [rows, affected] from TypeORM on Postgres.
  private rows(result: unknown) {
    return (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as Row[]
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
