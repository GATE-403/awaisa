import type { ConfigService } from '@nestjs/config'
import type { Env } from '../config/env.js'
import { TelegramGatewayService } from './telegram-gateway.service.js'

const createService = (token?: string) =>
  new TelegramGatewayService({
    get: () => token,
  } as unknown as ConfigService<Env, true>)

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

describe('TelegramGatewayService', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing without a token', async () => {
    await expect(createService().sendCode('+996555123456', '123456', 300)).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('checks ability, then sends our code with the paid request id', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: true, result: { request_id: 'req-1' } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, result: { request_id: 'req-1' } }))

    await expect(createService('token').sendCode('+996555123456', '123456', 300)).resolves.toBe(
      'req-1',
    )

    const [checkUrl, checkInit] = fetchMock.mock.calls[0] ?? []
    expect(checkUrl).toBe('https://gatewayapi.telegram.org/checkSendAbility')
    expect((checkInit?.headers as Record<string, string>).Authorization).toBe('Bearer token')
    const [sendUrl, sendInit] = fetchMock.mock.calls[1] ?? []
    expect(sendUrl).toBe('https://gatewayapi.telegram.org/sendVerificationMessage')
    expect(JSON.parse(String(sendInit?.body))).toEqual({
      phone_number: '+996555123456',
      request_id: 'req-1',
      code: '123456',
      ttl: 300,
    })
  })

  it('returns null so the caller can fall back to SMS when Telegram refuses', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: false, error: 'PHONE_NUMBER_NOT_FOUND' }))

    await expect(
      createService('token').sendCode('+996555123456', '123456', 300),
    ).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
