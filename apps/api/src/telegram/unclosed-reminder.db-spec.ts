import type { DataSource } from 'typeorm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { toBusinessParts } from '../common/business-time.js'
import {
  type Catalog,
  getCatalog,
  insertBooking,
  openTestDb,
  resetActivity,
} from '../database/testing/dbFixtures.js'
import { TelegramBotService } from './telegram-bot.service.js'

// The visits must have ended today in Bishkek: an hour after midnight there is not enough room.
const isTooEarly = toBusinessParts(new Date()).minutes < 90

describe.skipIf(isTooEarly)('TelegramBotService.sendUnclosedReminder', () => {
  let db: DataSource
  let catalog: Catalog

  beforeAll(async () => {
    db = await openTestDb()
    catalog = await getCatalog(db)
  })
  afterAll(() => db.destroy())
  beforeEach(() => resetActivity(db))

  it('counts today’s ended, unmarked visits of businesses with a linked chat', async () => {
    await insertBooking(db, catalog, { startsIn: -80 })
    await insertBooking(db, catalog, { startsIn: -45, minutes: 30 })
    await insertBooking(db, catalog, { startsIn: -12, minutes: 10, outcome: 'arrived' })
    await insertBooking(db, catalog, { startsIn: 120 })
    const config = { get: () => undefined }
    const service = new TelegramBotService(
      ...// The job reads the database and notifies; the other collaborators are never touched.
      ([db, null, null, config, null, null, null, null] as unknown as ConstructorParameters<
        typeof TelegramBotService
      >),
    )
    const notify = vi.spyOn(service, 'notifyBusiness').mockResolvedValue(undefined)

    await service.sendUnclosedReminder()
    expect(notify).not.toHaveBeenCalled()

    await db.query(`INSERT INTO "telegram_chats" ("business_id", "chat_id") VALUES ($1, 42)`, [
      catalog.businessId,
    ])
    await service.sendUnclosedReminder()

    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify.mock.calls[0]?.[0]).toBe(catalog.businessId)
    expect(notify.mock.calls[0]?.[1]).toContain('2')
  })
})
