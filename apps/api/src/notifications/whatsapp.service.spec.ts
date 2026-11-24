import type { ConfigService } from '@nestjs/config'
import type { Env } from '../config/env.js'
import { WhatsappService } from './whatsapp.service.js'
import { whatsappReminder } from './whatsapp-messages.js'

const settings: Partial<Env> = {
  WHATSAPP_DRIVER: 'meta',
  WHATSAPP_TOKEN: 'token',
  WHATSAPP_PHONE_NUMBER_ID: '1234',
  WHATSAPP_API_VERSION: 'v23.0',
  WHATSAPP_LANGUAGE: 'en',
  PUBLIC_WEB_URL: 'https://awaisa.kg',
}

const createService = (overrides: Partial<Env> = {}) =>
  new WhatsappService({
    get: (key: keyof Env) => ({ ...settings, ...overrides })[key],
  } as unknown as ConfigService<Env, true>)

const message = whatsappReminder(
  {
    business: { name: 'Awaisa Studio', slug: 'awaisa-studio' },
    serviceName: 'Haircut',
    specialistName: 'Erlan',
    date: '2026-11-24',
    time: '15:30',
  },
  true,
  'https://awaisa.kg/v/1?s=sig',
)

describe('WhatsappService', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the template to the number id with the token', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"messages":[{"id":"wamid.1"}]}'))
    await expect(createService().send('+996555123456', message)).resolves.toBe(true)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://graph.facebook.com/v23.0/1234/messages')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token')
    expect(JSON.parse(String(init?.body)).template.name).toBe('booking_reminder')
  })

  it('reports a refusal so the caller sends SMS', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"error":{"code":131026,"message":"Receiver is incapable"}}', { status: 400 }),
    )
    await expect(createService().send('+996555123456', message)).resolves.toBe(false)
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    await expect(createService().send('+996555123456', message)).resolves.toBe(false)
  })

  it('only logs with the log driver and is off with off', async () => {
    await expect(
      createService({ WHATSAPP_DRIVER: 'log' }).send('+996555123456', message),
    ).resolves.toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(createService({ WHATSAPP_DRIVER: 'off' }).isEnabled()).toBe(false)
  })
})
