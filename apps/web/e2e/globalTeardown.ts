import { existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const ROOT_ENV = join(__dirname, '../../../.env')

// Every record the suite creates is named "E2E …"; real clients and bookings are never matched.
const CLEANUP_SQL = `
  DELETE FROM "telegram_chats" WHERE "username" LIKE 'e2e%';
  DELETE FROM "client_records" WHERE "note" LIKE 'E2E %' OR "name" LIKE 'E2E %';
  DELETE FROM "waitlist_entries" WHERE "customer_name" LIKE 'E2E %';
  DELETE FROM "funnel_events" WHERE "session" LIKE 'e2e-%';
  DELETE FROM "funnel_sessions" WHERE "session" LIKE 'e2e-%';
  DELETE FROM "app_errors" WHERE "message" LIKE 'E2E %';
  DELETE FROM "business_questions" WHERE "author_name" LIKE 'E2E %';
  DELETE FROM "work_photos" WHERE "booking_id" IN (
    SELECT "id" FROM "bookings" WHERE "customer_name" LIKE 'E2E %');
  DELETE FROM "sales" WHERE "customer_name" LIKE 'E2E %' OR "id" IN (
    SELECT "sale_id" FROM "sale_items" WHERE "name" LIKE 'E2E %');
  DELETE FROM "cash_shifts" WHERE "note" LIKE 'E2E %';
  DELETE FROM "expenses" WHERE "note" LIKE 'E2E %' OR "category" LIKE 'E2E %';
  DELETE FROM "bookings" WHERE "customer_name" LIKE 'E2E %';
  DELETE FROM "stock_items" WHERE "name" LIKE 'E2E %';
  DELETE FROM "promotions" WHERE "title" LIKE 'E2E %';
  DELETE FROM "mailings" WHERE "text" LIKE 'E2E %';
  DELETE FROM "gift_certificates" WHERE "recipient" LIKE 'E2E %';
  DELETE FROM "client_subscriptions" WHERE "title" LIKE 'E2E %';
  DELETE FROM "subscription_plans" WHERE "title" LIKE 'E2E %';
  DELETE FROM "businesses" WHERE "name" LIKE 'E2E %';
  DELETE FROM "time_off" WHERE "reason" LIKE 'E2E %';
  DELETE FROM "otp_codes" WHERE "phone" IN (SELECT "phone" FROM "customers" WHERE "name" LIKE 'E2E %');
  DELETE FROM "customers" WHERE "name" LIKE 'E2E %';
`

const globalTeardown = async () => {
  if (existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV)
  const connectionString = process.env.DATABASE_URL
  if (!connectionString || process.env.E2E_BASE_URL) return

  const client = new pg.Client({ connectionString })
  await client.connect()
  try {
    await client.query(CLEANUP_SQL)
  } finally {
    await client.end()
  }
}

export default globalTeardown
