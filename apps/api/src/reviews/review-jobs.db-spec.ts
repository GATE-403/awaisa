import type { DataSource } from 'typeorm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type Catalog,
  getCatalog,
  insertBooking,
  openTestDb,
  resetActivity,
} from '../database/testing/dbFixtures.js'
import { ReviewRepliesService } from './review-replies.service.js'
import { ReviewsService } from './reviews.service.js'

const HOUR = 60

const insertReview = async (
  db: DataSource,
  catalog: Catalog,
  bookingId: string,
  rating: number,
  hoursAgo: number,
) => {
  const [row] = (await db.query(
    `INSERT INTO "reviews" ("business_id", "booking_id", "specialist_id", "service_id", "rating",
       "author_name", "created_at")
     VALUES ($1, $2, $3, $4, $5, 'Айбек', now() - make_interval(hours => $6)) RETURNING "id"`,
    [catalog.businessId, bookingId, catalog.specialistId, catalog.serviceId, rating, hoursAgo],
  )) as { id: string }[]
  return row.id
}

describe('review jobs', () => {
  let db: DataSource
  let catalog: Catalog

  beforeAll(async () => {
    db = await openTestDb()
    catalog = await getCatalog(db)
  })
  afterAll(() => db.destroy())
  beforeEach(() => resetActivity(db))

  it('asks for a review two hours after a visit, within a day, once', async () => {
    const send = vi.fn()
    const config = {
      get: (key: string) => (key === 'AUTH_SECRET' ? 'x'.repeat(32) : 'https://awaisa.test'),
    }
    const due = await insertBooking(db, catalog, { startsIn: -3 * HOUR })
    await insertBooking(db, catalog, { startsIn: -HOUR - 10, minutes: 30 })
    await insertBooking(db, catalog, { startsIn: -30 * HOUR })
    await insertBooking(db, catalog, { startsIn: -5 * HOUR, smsConfirmation: false })
    const reviewed = await insertBooking(db, catalog, { startsIn: -6 * HOUR })
    await insertReview(db, catalog, reviewed, 5, 1)
    const service = new ReviewsService(
      ...// The job reads the database and sends; the other collaborators are never touched.
      ([
        null,
        db,
        null,
        null,
        { send },
        null,
        config,
        null,
        null,
        null,
        null,
      ] as unknown as ConstructorParameters<typeof ReviewsService>),
    )

    await service.sendReviewRequests()
    await service.sendReviewRequests()

    expect(send).toHaveBeenCalledTimes(1)
    const asked = (await db.query(
      'SELECT "id" FROM "bookings" WHERE "review_requested_at" IS NOT NULL',
    )) as { id: string }[]
    expect(asked.map((row) => row.id)).toEqual([due])
  })

  it('answers good reviews an hour old that came after the switch, never poor ones', async () => {
    await db.query(
      `INSERT INTO "review_reply_settings" ("business_id", "auto_enabled", "auto_min_rating",
         "auto_template", "auto_since")
       VALUES ($1, true, 4, 'Спасибо, {имя}!', now() - interval '5 hours')`,
      [catalog.businessId],
    )
    const good = await insertReview(
      db,
      catalog,
      await insertBooking(db, catalog, { startsIn: -8 * HOUR }),
      5,
      2,
    )
    const fresh = await insertReview(
      db,
      catalog,
      await insertBooking(db, catalog, { startsIn: -9 * HOUR }),
      5,
      0,
    )
    const poor = await insertReview(
      db,
      catalog,
      await insertBooking(db, catalog, { startsIn: -10 * HOUR }),
      3,
      2,
    )
    const before = await insertReview(
      db,
      catalog,
      await insertBooking(db, catalog, { startsIn: -11 * HOUR }),
      5,
      6,
    )
    const bump = vi.fn()
    const service = new ReviewRepliesService(db, { bump } as never)

    await service.sendAutoReplies()

    const rows = (await db.query('SELECT "id", "reply", "is_auto_reply" FROM "reviews"')) as {
      id: string
      reply: string | null
      is_auto_reply: boolean
    }[]
    const byId = new Map(rows.map((row) => [row.id, row]))
    expect(byId.get(good)).toMatchObject({ reply: 'Спасибо, Айбек!', is_auto_reply: true })
    expect(byId.get(fresh)?.reply).toBeNull()
    expect(byId.get(poor)?.reply).toBeNull()
    expect(byId.get(before)?.reply).toBeNull()
    expect(bump).toHaveBeenCalledWith(['catalog'])
  })
})
