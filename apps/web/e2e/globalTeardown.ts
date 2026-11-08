import { existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const ROOT_ENV = join(__dirname, '../../../.env')

// Every record the suite creates is named "E2E …"; real clients and bookings are never matched.
const CLEANUP_SQL = `
  DELETE FROM "bookings" WHERE "customer_name" LIKE 'E2E %';
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
