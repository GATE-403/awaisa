import { randomUUID } from 'node:crypto'
import { DataSource } from 'typeorm'
import { inject } from 'vitest'

type Catalog = { businessId: string; slug: string; serviceId: string; specialistId: string }

type BookingInput = {
  /** Minutes from now the visit starts (negative: in the past). */
  startsIn: number
  minutes?: number
  phone?: string
  serviceId?: string
  smsConfirmation?: boolean
  reminderMinutes?: number | null
  outcome?: 'arrived' | 'no_show' | null
  paymentStatus?: 'pending' | 'paid' | null
}

const openTestDb = async () => {
  const db = new DataSource({ type: 'postgres', url: inject('dbUrl'), logging: ['error'] })
  await db.initialize()
  return db
}

// Rows the jobs read, emptied before each test (the seeded catalog stays).
const resetActivity = (db: DataSource) =>
  db.query(
    'TRUNCATE "bookings", "reviews", "review_reply_settings", "telegram_chats" RESTART IDENTITY CASCADE',
  )

// The catalog the migrations seed (Awaisa Studio): enough for a booking of any shape.
const getCatalog = async (db: DataSource): Promise<Catalog> => {
  const [row] = (await db.query(
    `SELECT b."id" AS "businessId", b."slug", s."id" AS "serviceId", sp."id" AS "specialistId"
     FROM "businesses" b
     JOIN "services" s ON s."business_id" = b."id" AND s."is_active"
     JOIN "specialists" sp ON sp."business_id" = b."id" AND sp."is_active"
     ORDER BY b."created_at", s."id", sp."id" LIMIT 1`,
  )) as Catalog[]
  if (!row) throw new Error('The migrations seeded no catalog')
  return row
}

let nextPhone = 0

const testPhone = () => {
  nextPhone += 1
  return `+996700${String(nextPhone).padStart(6, '0')}`
}

/**
 * A booking inserted as it is, no slot rules. Each one gets a master of its own time: the
 * no-overlap constraint is per master, so callers keep their visits apart in time.
 */
const insertBooking = async (db: DataSource, catalog: Catalog, input: BookingInput) => {
  const minutes = input.minutes ?? 30
  const [row] = (await db.query(
    `INSERT INTO "bookings" ("business_id", "service_id", "specialist_id", "starts_at", "ends_at",
       "customer_name", "customer_phone", "cancel_token_hash", "status", "sms_confirmation",
       "reminder_minutes", "outcome", "payment_status")
     VALUES ($1, $2, $3, now() + make_interval(mins => $4), now() + make_interval(mins => $4 + $5),
       'Test', $6, $7, 'confirmed', $8, $9, $10, $11)
     RETURNING "id"`,
    [
      catalog.businessId,
      input.serviceId ?? catalog.serviceId,
      catalog.specialistId,
      input.startsIn,
      minutes,
      input.phone ?? testPhone(),
      randomUUID(),
      input.smsConfirmation ?? true,
      input.reminderMinutes === undefined ? 120 : input.reminderMinutes,
      input.outcome ?? null,
      input.paymentStatus ?? null,
    ],
  )) as { id: string }[]
  return row.id
}

export type { Catalog }
export { getCatalog, insertBooking, openTestDb, resetActivity, testPhone }
