import type { DataSource } from 'typeorm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type Catalog,
  getCatalog,
  insertBooking,
  openTestDb,
  resetActivity,
  testPhone,
} from '../database/testing/dbFixtures.js'
import { ReturnVisitsService } from './return-visits.service.js'

const DAY = 24 * 60
const config = { get: () => 'https://awaisa.test' }

describe('ReturnVisitsService.sendDue', () => {
  let db: DataSource
  let catalog: Catalog
  const send = vi.fn()

  beforeAll(async () => {
    db = await openTestDb()
    catalog = await getCatalog(db)
    await db.query('UPDATE "services" SET "rebook_days" = 28 WHERE "id" = $1', [catalog.serviceId])
  })
  afterAll(async () => {
    await db.query('UPDATE "services" SET "rebook_days" = NULL WHERE "id" = $1', [
      catalog.serviceId,
    ])
    await db.destroy()
  })
  beforeEach(async () => {
    send.mockReset()
    await resetActivity(db)
    // The job sends only from 10:00 to 20:00 Bishkek; the SQL keeps the database's own clock.
    vi.useFakeTimers({ toFake: ['Date'] })
    const today = new Date().toISOString().slice(0, 10)
    vi.setSystemTime(new Date(`${today}T06:00:00Z`))
  })
  afterEach(() => vi.useRealTimers())

  it('reminds a client whose visit is due again, once', async () => {
    const due = await insertBooking(db, catalog, { startsIn: -29 * DAY })
    await insertBooking(db, catalog, { startsIn: -29 * DAY + 60, outcome: 'no_show' })
    await insertBooking(db, catalog, { startsIn: -29 * DAY + 120, smsConfirmation: false })
    await insertBooking(db, catalog, { startsIn: -40 * DAY })
    await insertBooking(db, catalog, { startsIn: -10 * DAY })
    const service = new ReturnVisitsService(db, { send } as never, config as never)

    await service.sendDue()
    await service.sendDue()

    expect(send).toHaveBeenCalledTimes(1)
    const claimed = (await db.query(
      'SELECT "id" FROM "bookings" WHERE "rebook_reminded_at" IS NOT NULL',
    )) as { id: string }[]
    expect(claimed.map((row) => row.id)).toEqual([due])
  })

  it('stays quiet when the client already booked that service again', async () => {
    const phone = testPhone()
    await insertBooking(db, catalog, { startsIn: -29 * DAY, phone })
    await insertBooking(db, catalog, { startsIn: 2 * DAY, phone })
    const service = new ReturnVisitsService(db, { send } as never, config as never)

    await service.sendDue()

    expect(send).not.toHaveBeenCalled()
  })

  it('sends nothing outside the day hours', async () => {
    await insertBooking(db, catalog, { startsIn: -29 * DAY })
    vi.setSystemTime(new Date(`${new Date().toISOString().slice(0, 10)}T18:00:00Z`))
    const service = new ReturnVisitsService(db, { send } as never, config as never)

    await service.sendDue()

    expect(send).not.toHaveBeenCalled()
  })
})
