import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

type Rank = 1 | 2 | 3

const TTL_MS = 10 * 60_000
const MIN_REVIEWS = 3
const MIN_PLACE_REVIEWS = 5
const PRIOR_RATING = 4.3
const PRIOR_WEIGHT = 10

/**
 * The laurel wreaths: the three best masters on the platform (rating pulled toward the average
 * until there are enough reviews, at least three) and the three most active clients (the profile
 * level's points: visits × 10 + reviews × 15). Recounted at most every ten minutes.
 */
@Injectable()
export class RankingsService {
  private masters: { value: Map<string, Rank>; at: number } | null = null
  private clients: { value: Map<string, Rank>; at: number } | null = null

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async masterRanks() {
    if (this.masters && Date.now() - this.masters.at < TTL_MS) return this.masters.value
    const rows = (await this.dataSource.query(
      `SELECT r."specialist_id" AS "id"
       FROM "reviews" r
       JOIN "specialists" sp ON sp."id" = r."specialist_id" AND sp."is_active"
       JOIN "businesses" b ON b."id" = sp."business_id" AND b."is_published"
       GROUP BY r."specialist_id"
       HAVING COUNT(*) >= $1::int
       ORDER BY (SUM(r."rating") + $2::float8 * $3::int) / (COUNT(*) + $3::int) DESC, COUNT(*) DESC
       LIMIT 3`,
      [MIN_REVIEWS, PRIOR_RATING, PRIOR_WEIGHT],
    )) as { id: string }[]
    const value = new Map(rows.map((row, index) => [String(row.id), (index + 1) as Rank]))
    this.masters = { value, at: Date.now() }
    return value
  }

  /**
   * The masters' leaderboard for one kind of place (barbers by default): the same score as the
   * wreaths, with what a card needs - face, place, rating, how many reviews and recent visits.
   */
  async leaderboard(kind: string, limit: number) {
    const rows = (await this.dataSource.query(
      `SELECT sp."id", sp."name", sp."role", sp."photo_url" AS "photoUrl",
         b."slug", b."name" AS "businessName", b."logo_url" AS "logoUrl",
         COUNT(r."id")::int AS "reviews",
         ROUND(AVG(r."rating")::numeric, 1)::float8 AS "average",
         (SUM(r."rating") + $2::float8 * $3::int) / (COUNT(r."id") + $3::int) AS "score",
         (SELECT COUNT(*)::int FROM "bookings" bk
           WHERE bk."specialist_id" = sp."id" AND bk."status" = 'confirmed'
             AND bk."starts_at" > now() - interval '30 days' AND bk."starts_at" < now()) AS "visits30d"
       FROM "specialists" sp
       JOIN "businesses" b ON b."id" = sp."business_id" AND b."is_published" AND b."kind" = $4
       JOIN "reviews" r ON r."specialist_id" = sp."id"
       WHERE sp."is_active"
       GROUP BY sp."id", b."id"
       HAVING COUNT(r."id") >= $1::int
       ORDER BY "score" DESC, "reviews" DESC
       LIMIT $5::int`,
      [MIN_REVIEWS, PRIOR_RATING, PRIOR_WEIGHT, kind, limit],
    )) as Record<string, unknown>[]
    const platform = await this.masterRanks()

    return rows.map((row, index) => ({
      place: index + 1,
      // The wreath stays the platform's top three, whatever the kind.
      rank: platform.get(String(row.id)) ?? null,
      id: String(row.id),
      name: String(row.name),
      role: String(row.role ?? ''),
      photoUrl: (row.photoUrl as string | null) ?? null,
      average: Number(row.average),
      reviews: Number(row.reviews),
      visits30d: Number(row.visits30d),
      business: {
        slug: String(row.slug),
        name: String(row.businessName),
        logoUrl: (row.logoUrl as string | null) ?? null,
      },
    }))
  }

  /** The places' leaderboard for one kind: reviews of the place, the same score, at least five. */
  async placesLeaderboard(kind: string, limit: number) {
    const rows = (await this.dataSource.query(
      `SELECT b."id", b."slug", b."name", b."logo_url" AS "logoUrl", b."cover_url" AS "coverUrl",
         (SELECT br."address" FROM "branches" br
           WHERE br."business_id" = b."id" AND br."is_active" ORDER BY br."position" LIMIT 1) AS "address",
         COUNT(r."id")::int AS "reviews",
         ROUND(AVG(r."rating")::numeric, 1)::float8 AS "average",
         (SUM(r."rating") + $2::float8 * $3::int) / (COUNT(r."id") + $3::int) AS "score",
         (SELECT COUNT(*)::int FROM "bookings" bk
           WHERE bk."business_id" = b."id" AND bk."status" = 'confirmed'
             AND bk."starts_at" > now() - interval '30 days' AND bk."starts_at" < now()) AS "visits30d"
       FROM "businesses" b
       JOIN "reviews" r ON r."business_id" = b."id"
       WHERE b."is_published" AND b."kind" = $4
       GROUP BY b."id"
       HAVING COUNT(r."id") >= $1::int
       ORDER BY "score" DESC, "reviews" DESC
       LIMIT $5::int`,
      [MIN_PLACE_REVIEWS, PRIOR_RATING, PRIOR_WEIGHT, kind, limit],
    )) as Record<string, unknown>[]

    return rows.map((row, index) => ({
      place: index + 1,
      slug: String(row.slug),
      name: String(row.name),
      logoUrl: (row.logoUrl as string | null) ?? null,
      coverUrl: (row.coverUrl as string | null) ?? null,
      address: (row.address as string | null) ?? null,
      average: Number(row.average),
      reviews: Number(row.reviews),
      visits30d: Number(row.visits30d),
    }))
  }

  /** By phone: the clients with the most points. */
  async clientRanks() {
    if (this.clients && Date.now() - this.clients.at < TTL_MS) return this.clients.value
    const rows = (await this.dataSource.query(
      `WITH visits AS (
         SELECT "customer_phone" AS "phone", COUNT(*) * 10 AS "xp" FROM "bookings"
         WHERE "status" = 'confirmed' AND "starts_at" < now() AND "outcome" IS DISTINCT FROM 'no_show'
         GROUP BY "customer_phone"
       ),
       written AS (
         SELECT b."customer_phone" AS "phone", COUNT(*) * 15 AS "xp"
         FROM "reviews" r JOIN "bookings" b ON b."id" = r."booking_id"
         WHERE r."anonymized_at" IS NULL
         GROUP BY b."customer_phone"
       )
       SELECT v."phone" FROM visits v LEFT JOIN written w ON w."phone" = v."phone"
       LEFT JOIN "customers" c ON c."phone" = v."phone"
       WHERE c."is_public" IS DISTINCT FROM false
       ORDER BY v."xp" + COALESCE(w."xp", 0) DESC
       LIMIT 3`,
    )) as { phone: string }[]
    const value = new Map(rows.map((row, index) => [String(row.phone), (index + 1) as Rank]))
    this.clients = { value, at: Date.now() }
    return value
  }
}

export type { Rank }
