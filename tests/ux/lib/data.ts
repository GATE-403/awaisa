import { createHmac } from 'node:crypto'
import { mkdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { type APIRequestContext, request } from '@playwright/test'

// Test data only: «E2E UX …» names (removed by the e2e teardown), the fixed OTP code the UX
// API runs with, the built-in test checkout. No real account, number or key is ever used.

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4310'
const BASE_URL = process.env.UX_BASE_URL ?? 'http://localhost:3310'
const SLUG = 'awaisa-studio'
const TEST_CODE = '111111'
const DEV_AUTH_SECRET = 'dev-only-secret-change-me-in-production-0000'
// A platform admin number for the UX API only (playwright.config.ts → ADMIN_PHONES).
const UX_ADMIN_PHONE = '+996700000099'

type Specialist = { id: string; name: string; serviceIds: string[] }
type BusinessView = {
  catalog: { specialists: Specialist[]; services: { id: string; name: string }[] }
}

const randomPhone = () => `+99677${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`

const getBusiness = async (slug = SLUG) =>
  (await (await fetch(`${API_URL}/businesses/${slug}`)).json()) as BusinessView

const dayKey = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000 + 6 * 3_600_000).toISOString().slice(0, 10)

/** The first free time of a master's first service within two weeks. */
const findFreeSlot = async (specialistIndex = 0, fromDay = 1) => {
  const business = await getBusiness()
  const specialist = business.catalog.specialists[specialistIndex]
  const serviceId = specialist.serviceIds[0]
  for (let offset = fromDay; offset <= 14; offset += 1) {
    const date = dayKey(offset)
    const availability = await (
      await fetch(
        `${API_URL}/availability?serviceId=${serviceId}&specialistId=${specialist.id}&date=${date}`,
      )
    ).json()
    const slot = (availability.slots as { time: string; isAvailable: boolean }[]).find(
      (item) => item.isAvailable,
    )
    if (slot) return { serviceId, specialist, date, time: slot.time }
  }
  throw new Error('No free slot in two weeks')
}

/** A request context signed in with the test code; cookies stay inside it. */
const signedInRequest = async (phone: string, name: string) => {
  const context = await request.newContext({ baseURL: BASE_URL })
  const otp = await context.post('/api/auth/otp', { data: { phone, channel: 'sms' } })
  if (!otp.ok()) throw new Error(`OTP ${otp.status()}: ${await otp.text()}`)
  const verify = await context.post('/api/auth/verify', { data: { phone, code: TEST_CODE } })
  if (!verify.ok()) throw new Error(`Verify ${verify.status()}: ${await verify.text()}`)
  await context.patch('/api/me', { data: { name } })
  return context
}

const bookAs = async (
  context: APIRequestContext,
  name: string,
  phone: string,
  specialistIndex = 0,
) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slot = await findFreeSlot(specialistIndex + attempt, 2)
    const response = await context.post('/api/bookings', {
      data: {
        serviceId: slot.serviceId,
        specialistId: slot.specialist.id,
        date: slot.date,
        time: slot.time,
        name,
        phone,
        smsConfirmation: false,
      },
    })
    if (response.ok()) return (await response.json()) as { id: string; cancelToken: string }
  }
  throw new Error('Could not book a test visit')
}

// The same link the «как прошёл визит?» SMS carries.
const reviewLink = (bookingId: string) => {
  const signature = createHmac('sha256', process.env.AUTH_SECRET || DEV_AUTH_SECRET)
    .update(`review:${bookingId}`)
    .digest('base64url')
    .slice(0, 22)
  return `/review/${bookingId}?s=${signature}`
}

// Flows that change shared seed data (a service's deposit, a master's rating) run one at a time
// across workers: a directory is created atomically or not at all.
const withLock = async <T>(name: string, run: () => Promise<T>) => {
  const dir = join(__dirname, '../test-results/.locks', name)
  mkdirSync(join(__dirname, '../test-results/.locks'), { recursive: true })
  const deadline = Date.now() + 120_000
  for (;;) {
    try {
      mkdirSync(dir)
      break
    } catch {
      const age = Date.now() - (statSync(dir, { throwIfNoEntry: false })?.mtimeMs ?? Date.now())
      if (age > 180_000) rmSync(dir, { recursive: true, force: true })
      if (Date.now() > deadline) throw new Error(`Lock ${name} is busy`)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  try {
    return await run()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export {
  API_URL,
  BASE_URL,
  bookAs,
  dayKey,
  findFreeSlot,
  getBusiness,
  randomPhone,
  reviewLink,
  SLUG,
  signedInRequest,
  TEST_CODE,
  UX_ADMIN_PHONE,
  withLock,
}
