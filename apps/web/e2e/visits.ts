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
  /** Who invited this client (`?ref=`), sent with the booking. */
  ref?: string,
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
        ref,
      }),
    })
    const booking = await response.json()
    // Far back, with a random minute: no overlap with any real visit of that master.
    const days = daysBack === undefined ? 400 + Math.floor(Math.random() * 300) : daysBack
    // The booking was made `offset` days ahead; moving it back by offset + days lands `days` ago.
    // A real visit may sit at that hour: try other hours until one is free.
    const pastDate = await withDb(async (client) => {
      // On a set day the seed's visits may fill the master's hours: walk away from the booked
      // time both ways in half hours, out to the night if need be, where nothing ever sits.
      // The visit stays on its day: only shifts that keep it between 00:00 and 24:00.
      const [hours = 0, mins = 0] = String(slot.time).split(':').map(Number)
      const start = hours * 60 + mins
      const length = Number(booking.durationMinutes) || 60
      const shifts = Array.from(
        { length: 97 },
        (_, index) => Math.ceil(index / 2) * (index % 2 === 0 ? 1 : -1) * 30,
      ).filter((shift) => start - shift >= 0 && start - shift + length <= 24 * 60)
      const attempts = daysBack === undefined ? 12 : shifts.length
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        // The interval is subtracted: a positive shift moves the visit earlier.
        const minutes =
          daysBack === undefined ? Math.floor(Math.random() * 50) : (shifts[attempt] ?? 0)
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

type Slot = { time: string; isAvailable: boolean }

// A client's online booking of awaisa-studio two to fourteen days ahead, on the first day where
// that master has `minFree` free times (a move needs a second one), with its device token.
const bookAhead = async ({
  specialistIndex,
  name,
  minFree = 1,
}: {
  specialistIndex: number
  name: string
  minFree?: number
}) => {
  const business = await (await fetch(`${API_URL}/businesses/${SLUG}`)).json()
  const specialist = business.catalog.specialists[specialistIndex]
  const serviceId = specialist.serviceIds[0]
  for (let offset = 2; offset <= 14; offset += 1) {
    const date = new Date(Date.now() + offset * 86_400_000 + 6 * 3_600_000)
      .toISOString()
      .slice(0, 10)
    const { slots } = await (
      await fetch(
        `${API_URL}/availability?serviceId=${serviceId}&specialistId=${specialist.id}&date=${date}`,
      )
    ).json()
    const free = (slots as Slot[]).filter((slot) => slot.isAvailable)
    if (free.length < minFree) continue
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        specialistId: specialist.id,
        date,
        time: free[0]?.time,
        name,
        phone: randomClientPhone(),
        smsConfirmation: false,
      }),
    })
    return response.json()
  }
  throw new Error('No free day to book')
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

export { bookAhead, createFutureVisit, createPastVisit, withDb }
