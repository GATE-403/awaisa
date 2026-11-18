import { createHash, randomBytes } from 'node:crypto'
import pg from 'pg'
import type { Dataset } from '../types.ts'

// Reads the local database in a read-only transaction and keeps nothing personal: phones become
// a salted hash (the salt lives only in this process, so the export cannot be joined back to a
// number), names, comments and authors are never selected.

const hashClient = (salt: Buffer) => (phone: string) =>
  createHash('sha256').update(salt).update(phone).digest('hex').slice(0, 16)

const exportDb = async (databaseUrl: string): Promise<Dataset> => {
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    await client.query('BEGIN READ ONLY')
    const [items, visits, reviews] = await Promise.all([
      client.query(
        `SELECT s."id" AS "serviceId", s."name", s."price"::int AS "price", b."slug",
           b."id" AS "businessId", b."name" AS "businessName", b."kind", s."rebook_days" AS "rebookDays"
         FROM "services" s JOIN "businesses" b ON b."id" = s."business_id"
         WHERE s."is_active" AND b."is_published"`,
      ),
      client.query(
        `SELECT bk."customer_phone" AS "phone", bk."service_id" AS "serviceId",
           bk."starts_at" AS "startsAt", bk."outcome" = 'no_show' AS "isNoShow"
         FROM "bookings" bk
         WHERE bk."status" = 'confirmed' AND bk."starts_at" < now()
         ORDER BY bk."starts_at"`,
      ),
      client.query(
        `SELECT r."business_id" AS "businessId", r."rating"::int AS "rating", r."created_at" AS "createdAt"
         FROM "reviews" r`,
      ),
    ])
    await client.query('COMMIT')
    const hash = hashClient(randomBytes(16))
    return {
      source: 'db',
      note: 'Локальная демо-база (pnpm db:seed): синтетические клиенты и визиты, не реальные люди.',
      items: items.rows.map((row) => ({
        serviceId: String(row.serviceId),
        name: String(row.name),
        price: Number(row.price),
        slug: String(row.slug),
        businessId: String(row.businessId),
        businessName: String(row.businessName),
        kind: String(row.kind),
        rebookDays: row.rebookDays === null ? null : Number(row.rebookDays),
      })),
      visits: visits.rows.map((row) => ({
        client: hash(String(row.phone)),
        serviceId: String(row.serviceId),
        time: new Date(row.startsAt).getTime(),
        isNoShow: row.isNoShow === true,
      })),
      reviews: reviews.rows.map((row) => ({
        businessId: String(row.businessId),
        rating: Number(row.rating),
        time: new Date(row.createdAt).getTime(),
      })),
    }
  } finally {
    await client.end()
  }
}

export { exportDb }
