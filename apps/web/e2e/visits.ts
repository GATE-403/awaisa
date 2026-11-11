import { existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { randomClientPhone } from './account'
import { API_URL } from './helpers'

const ROOT_ENV = join(__dirname, '../../../.env')
const SLUG = 'awaisa-studio'

if (existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV)

const withDb = async <T>(run: (client: pg.Client) => Promise<T>) => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

// A real booking moved into the past, as if the visit already happened.
const createPastVisit = async (
  name = 'E2E Отзыв Тестов',
  phone = randomClientPhone(),
  specialistIndex = 0,
  /** How far back to move the visit; far by default so it never meets a real one. */
  daysBack?: number,
) => {
  const business = await (await fetch(`${API_URL}/businesses/${SLUG}`)).json()
  const specialist = business.catalog.specialists[specialistIndex]
  const serviceId = specialist.serviceIds[0]
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = new Date(Date.now() + offset * 86_400_000 + 6 * 3_600_000)
      .toISOString()
      .slice(0, 10)
    const availability = await (
      await fetch(
        `${API_URL}/availability?serviceId=${serviceId}&specialistId=${specialist.id}&date=${date}`,
      )
    ).json()
    const slot = availability.slots.find((item: { isAvailable: boolean }) => item.isAvailable)
    if (!slot) continue
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        specialistId: specialist.id,
        date,
        time: slot.time,
        name,
        phone,
        smsConfirmation: false,
      }),
    })
    const booking = await response.json()
    // Far back, with a random minute: no overlap with any real visit of that master.
    const days = daysBack === undefined ? 400 + Math.floor(Math.random() * 300) : daysBack
    // The booking was made `offset` days ahead; moving it back by offset + days lands `days` ago.
    // A real visit may sit at that hour: try other hours until one is free.
    const pastDate = await withDb(async (client) => {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const minutes = daysBack === undefined ? Math.floor(Math.random() * 50) : -attempt * 30
        try {
          const { rows } = await client.query(
            `UPDATE "bookings" SET "starts_at" = "starts_at" - make_interval(days => $2, mins => $3),
               "ends_at" = "ends_at" - make_interval(days => $2, mins => $3) WHERE "id" = $1
             RETURNING to_char("starts_at" AT TIME ZONE 'UTC' + interval '6 hours', 'YYYY-MM-DD') AS "date"`,
            [
              booking.id,
              // Far back mode also walks to other days when a slot is taken.
              daysBack === undefined ? days + attempt * 3 : days + offset,
              minutes,
            ],
          )
          return rows[0]?.date as string
        } catch (error) {
          if ((error as { code?: string }).code !== '23P01') throw error
        }
      }
      throw new Error('No free past slot for the visit')
    })
    return { booking, specialist, date: pastDate }
  }
  throw new Error('No free slot to create a visit')
}

// A real booking a few days ahead (for checks that the future cannot be marked).
const createFutureVisit = async (name: string, phone: string) => {
  const visit = await createPastVisit(name, phone)
  await withDb(async (client) => {
    // Another run's visit may already sit there: try other minutes until the slot is free.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const minutes = Math.floor(Math.random() * 600)
      try {
        await client.query(
          `UPDATE "bookings" SET "starts_at" = now() + interval '20 days' + make_interval(mins => $2),
             "ends_at" = now() + interval '20 days' + make_interval(mins => $2 + 45) WHERE "id" = $1`,
          [visit.booking.id, minutes],
        )
        return
      } catch (error) {
        if ((error as { code?: string }).code !== '23P01') throw error
      }
    }
    throw new Error('No free future slot for the visit')
  })
  return visit
}

export { createFutureVisit, createPastVisit, withDb }
