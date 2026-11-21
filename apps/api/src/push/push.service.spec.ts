import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendNotification = vi.fn()

vi.mock('web-push', () => {
  class WebPushError extends Error {
    constructor(
      message: string,
      readonly statusCode: number,
    ) {
      super(message)
    }
  }
  return { default: { setVapidDetails: vi.fn(), sendNotification }, WebPushError }
})

const { WebPushError } = await import('web-push')
const { PushService } = await import('./push.service.js')

const booking = {
  id: 'b1',
  date: '2026-11-26',
  time: '14:30',
  serviceName: 'Мужская стрижка',
  specialistId: 'timur',
  specialistName: 'Тимур',
  customerName: 'Айбек',
  business: { slug: 'old-school', name: 'Old School' },
}

const recipient = (id: string, audience: 'member' | 'master') => ({
  id,
  endpoint: `https://push.example/${id}`,
  p256dh: 'key',
  auth: 'auth',
  audience,
})

const setup = (keys: Record<string, string | undefined>, rows: unknown[]) => {
  const repository = { update: vi.fn(), delete: vi.fn(), upsert: vi.fn() }
  const dataSource = { query: vi.fn().mockResolvedValue(rows) }
  const config = { get: (name: string) => keys[name] }
  const service = new PushService(repository as never, dataSource as never, config as never)
  return { service, repository, dataSource }
}

const KEYS = {
  VAPID_PUBLIC_KEY: 'public',
  VAPID_PRIVATE_KEY: 'private',
  VAPID_SUBJECT: 'mailto:dev@example.com',
}

describe('PushService', () => {
  beforeEach(() => {
    sendNotification.mockReset()
  })

  it('is hidden without keys and only logs', async () => {
    const { service } = setup({}, [recipient('s1', 'member')])

    expect(service.config).toEqual({ isAvailable: false, publicKey: null })
    await service.notifyBooking('created', booking, 'business-1')
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('sends each recipient the message for their audience and notes the success', async () => {
    sendNotification.mockResolvedValue({ statusCode: 201 })
    const { service, repository } = setup(KEYS, [
      recipient('s1', 'member'),
      recipient('s2', 'master'),
    ])

    await service.notifyBooking('created', booking, 'business-1')

    const payloads = sendNotification.mock.calls.map((call) => JSON.parse(call[1] as string))
    expect(payloads.map((payload) => payload.url)).toEqual([
      '/manage/old-school?tab=schedule&date=2026-11-26&booking=b1',
      '/master/old-school?date=2026-11-26',
    ])
    expect(repository.update).toHaveBeenCalledTimes(2)
  })

  it('forgets a subscription the push service no longer knows', async () => {
    sendNotification.mockRejectedValueOnce(
      new WebPushError('Gone', 410, {}, '', 'https://push.example/gone'),
    )
    sendNotification.mockRejectedValueOnce(
      new WebPushError('Server error', 500, {}, '', 'https://push.example/flaky'),
    )
    const { service, repository } = setup(KEYS, [
      recipient('gone', 'member'),
      recipient('flaky', 'member'),
    ])

    await service.notifyBooking('cancelled', booking, 'business-1')

    expect(repository.delete).toHaveBeenCalledTimes(1)
    expect(repository.delete).toHaveBeenCalledWith({ id: 'gone' })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('never throws when the recipients cannot be read', async () => {
    const { service, dataSource } = setup(KEYS, [])
    dataSource.query.mockRejectedValue(new Error('database down'))

    await expect(service.notifyBooking('created', booking, 'business-1')).resolves.toBeUndefined()
  })
})
