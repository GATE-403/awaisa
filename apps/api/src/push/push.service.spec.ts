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
  kind: 'web',
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

const appRecipient = (id: string, audience: 'member' | 'master') => ({
  id,
  kind: 'expo',
  endpoint: `ExponentPushToken[${id}]`,
  p256dh: null,
  auth: null,
  audience,
})

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

    expect(service.config).toEqual({
      isAvailable: false,
      publicKey: null,
      isNativeAvailable: false,
    })
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

describe('PushService in the app', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    sendNotification.mockReset()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('only logs without an access token', async () => {
    const { service } = setup({}, [appRecipient('a1', 'member')])

    await service.notifyBooking('created', booking, 'business-1')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the app the same text in one batch and forgets a dead token', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { status: 'ok', id: 't1' },
            { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
          ],
        }),
      ),
    )
    const { service, repository } = setup({ ...KEYS, EXPO_ACCESS_TOKEN: 'expo-secret' }, [
      recipient('s1', 'member'),
      appRecipient('a1', 'member'),
      appRecipient('a2', 'master'),
    ])
    sendNotification.mockResolvedValue({ statusCode: 201 })

    expect(service.config.isNativeAvailable).toBe(true)
    await service.notifyBooking('created', booking, 'business-1')

    expect(sendNotification).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://exp.host/--/api/v2/push/send')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer expo-secret')
    const messages = JSON.parse(init.body as string)
    expect(messages.map((message: { to: string }) => message.to)).toEqual([
      'ExponentPushToken[a1]',
      'ExponentPushToken[a2]',
    ])
    expect(messages[0].data.url).toBe('/manage/old-school?tab=schedule&date=2026-11-26&booking=b1')
    expect(messages[1].data.url).toBe('/master/old-school?date=2026-11-26')
    expect(messages[0].title).toBe('Новая запись')
    expect(repository.delete).toHaveBeenCalledWith(expect.objectContaining({ kind: 'expo' }))
  })

  it('never throws when the Expo service is down', async () => {
    fetchMock.mockRejectedValue(new Error('network'))
    const { service, repository } = setup({ EXPO_ACCESS_TOKEN: 'expo-secret' }, [
      appRecipient('a1', 'member'),
    ])

    await expect(service.notifyBooking('created', booking, 'business-1')).resolves.toBeUndefined()
    expect(repository.delete).not.toHaveBeenCalled()
  })
})
