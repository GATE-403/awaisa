import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from '../cache/cache.service.js'
import type { RuntimeService } from '../runtime/runtime.service.js'
import type { TelegramBotService } from '../telegram/telegram-bot.service.js'
import { errorsAlertText } from './alert-messages.js'
import { AlertsService } from './alerts.service.js'
import type { TelemetryService } from './telemetry.service.js'

type Group = { source: string; message: string; count: number }

const setup = (batches: Group[][], redisClient: unknown = null) => {
  const query = vi.fn()
  for (const batch of batches) query.mockResolvedValueOnce(batch)
  const sendAlert = vi.fn().mockResolvedValue(undefined)
  const service = new AlertsService(
    { query } as never,
    { recordError: vi.fn() } as unknown as TelemetryService,
    { sendAlert } as unknown as TelegramBotService,
    { redisClient } as unknown as CacheService,
    { runsJobs: true } as RuntimeService,
  )
  return { service, sendAlert }
}

describe('AlertsService', () => {
  it('reports server errors at once and the same one again only after an hour', async () => {
    const boom = { source: 'api', message: 'POST /bookings: boom', count: 2 }
    const { service, sendAlert } = setup([[boom], [boom]])

    await service.checkErrors()
    await service.checkErrors()

    expect(sendAlert).toHaveBeenCalledTimes(1)
    expect(sendAlert.mock.calls[0]?.[0]).toContain('POST /bookings: boom')
  })

  it('ignores a stray browser error but reports a burst', async () => {
    const { service, sendAlert } = setup([
      [{ source: 'web', message: 'Script error', count: 2 }],
      [{ source: 'web', message: 'Cannot read x', count: 12 }],
    ])

    await service.checkErrors()
    expect(sendAlert).not.toHaveBeenCalled()
    await service.checkErrors()
    expect(sendAlert).toHaveBeenCalledTimes(1)
  })

  it('says when Redis stops answering', async () => {
    process.env.REDIS_URL = 'redis://test'
    const { service, sendAlert } = setup([], { ping: vi.fn().mockRejectedValue(new Error('down')) })

    await service.checkRedis()
    delete process.env.REDIS_URL

    expect(sendAlert.mock.calls[0]?.[0]).toContain('Redis unavailable')
  })
})

describe('errorsAlertText', () => {
  it('lists the worst five, counts the rest and escapes HTML', () => {
    const groups = Array.from({ length: 7 }, (_, index) => ({
      source: 'api',
      message: `<b>error ${index}</b>`,
      count: 7 - index,
    }))
    const text = errorsAlertText(groups, 5)

    expect(text).toContain('Errors in 5 min: 28')
    expect(text).toContain('&lt;b&gt;error 0&lt;/b&gt;')
    expect(text).not.toContain('error 5')
    expect(text).toContain('…and 2 more kinds')
  })
})
