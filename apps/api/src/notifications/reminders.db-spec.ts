import type { DataSource } from 'typeorm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type Catalog,
  getCatalog,
  insertBooking,
  openTestDb,
  resetActivity,
} from '../database/testing/dbFixtures.js'
import { RemindersService } from './reminders.service.js'

const config = {
  get: (key: string) => (key === 'AUTH_SECRET' ? 'x'.repeat(32) : 'https://awaisa.test'),
}

describe('RemindersService.sendDueReminders', () => {
  let db: DataSource
  let catalog: Catalog
  const send = vi.fn()

  beforeAll(async () => {
    db = await openTestDb()
    catalog = await getCatalog(db)
  })
  afterAll(() => db.destroy())
  beforeEach(async () => {
    send.mockReset()
    await resetActivity(db)
  })

  it('texts visits inside their reminder lead once, and nothing else', async () => {
    const due = await insertBooking(db, catalog, { startsIn: 60, reminderMinutes: 120 })
    await insertBooking(db, catalog, { startsIn: 300, reminderMinutes: 120 })
    await insertBooking(db, catalog, { startsIn: 400, reminderMinutes: null })
    await insertBooking(db, catalog, {
      startsIn: 90,
      reminderMinutes: 120,
      paymentStatus: 'pending',
    })
    await insertBooking(db, catalog, { startsIn: -200, reminderMinutes: 120 })
    const service = new RemindersService(db, { send } as never, config as never)

    await service.sendDueReminders()
    await service.sendDueReminders()

    expect(send).toHaveBeenCalledTimes(1)
    const claimed = (await db.query(
      `SELECT "id" FROM "bookings" WHERE "reminder_sent_at" IS NOT NULL`,
    )) as { id: string }[]
    expect(claimed.map((row) => row.id)).toEqual([due])
  })

  it('two instances running at once text a visit once', async () => {
    await insertBooking(db, catalog, { startsIn: 30, reminderMinutes: 60 })
    const first = new RemindersService(db, { send } as never, config as never)
    const second = new RemindersService(db, { send } as never, config as never)

    await Promise.all([first.sendDueReminders(), second.sendDueReminders()])

    expect(send).toHaveBeenCalledTimes(1)
  })
})
