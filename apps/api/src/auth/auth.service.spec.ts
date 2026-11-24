import type { ConfigService } from '@nestjs/config'
import type { Repository } from 'typeorm'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import type { SmsService } from '../notifications/sms.service.js'
import type { TelegramGatewayService } from '../notifications/telegram-gateway.service.js'
import { AuthService } from './auth.service.js'
import type { OtpCode } from './otp-code.entity.js'
import type { Session } from './session.entity.js'

const PHONE = '+996555123456'

type Options = {
  nodeEnv?: Env['NODE_ENV']
  gateway?: boolean
  gatewayAnswer?: string | null
  testCode?: string
}

const setup = ({
  nodeEnv = 'production',
  gateway = true,
  gatewayAnswer = 'req-1',
  testCode,
}: Options = {}) => {
  const values: Partial<Env> = {
    NODE_ENV: nodeEnv,
    OTP_TEST_CODE: testCode,
    SMS_ALLOWED_COUNTRY_CODES: ['996'],
    AUTH_SECRET: 'x'.repeat(32),
  }
  const config = { get: (key: keyof Env) => values[key] } as unknown as ConfigService<Env, true>
  const codes = {
    find: vi.fn(async () => []),
    create: vi.fn((value: Partial<OtpCode>) => value),
    save: vi.fn(async (value: Partial<OtpCode>) => value),
  }
  const sms = { canSendTo: () => true, send: vi.fn() }
  const telegram = {
    isEnabled: gateway,
    sendCode: vi.fn(async () => gatewayAnswer),
  }
  const service = new AuthService(
    codes as unknown as Repository<OtpCode>,
    {} as Repository<Session>,
    {} as Repository<Customer>,
    config,
    sms as unknown as SmsService,
    telegram as unknown as TelegramGatewayService,
  )
  return { service, codes, sms, telegram }
}

describe('AuthService.requestCode', () => {
  it('sends the code to Telegram and never by SMS', async () => {
    const { service, codes, sms, telegram } = setup()

    const result = await service.requestCode('0555 123 456')

    expect(result).toEqual({ phone: PHONE, channel: 'telegram', resendAfterSeconds: 60 })
    expect(telegram.sendCode).toHaveBeenCalledWith(PHONE, expect.stringMatching(/^\d{6}$/), 300)
    expect(sms.send).not.toHaveBeenCalled()
    expect(codes.save).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'telegram', providerRequestId: 'req-1' }),
    )
  })

  it('refuses when Telegram cannot take the code, with no SMS instead', async () => {
    const { service, codes, sms } = setup({ gatewayAnswer: null })

    await expect(service.requestCode(PHONE)).rejects.toThrow('Не получилось отправить код')
    expect(sms.send).not.toHaveBeenCalled()
    expect(codes.save).not.toHaveBeenCalled()
  })

  it('points to the bot when production has no gateway', async () => {
    const { service, codes } = setup({ gateway: false })

    expect(service.isCodeAvailable).toBe(false)
    await expect(service.requestCode(PHONE)).rejects.toThrow('Войдите через Telegram-бота')
    expect(codes.find).not.toHaveBeenCalled()
  })

  it('only logs the code in development without a gateway', async () => {
    const { service, codes, telegram } = setup({ nodeEnv: 'development', gateway: false })

    expect(service.isCodeAvailable).toBe(true)
    await service.requestCode(PHONE)
    expect(telegram.sendCode).not.toHaveBeenCalled()
    expect(codes.save).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'telegram', providerRequestId: null }),
    )
  })

  it('keeps a fixed test code out of Telegram', async () => {
    const { service, telegram } = setup({ testCode: '111111' })

    await service.requestCode(PHONE)
    expect(telegram.sendCode).not.toHaveBeenCalled()
  })
})
