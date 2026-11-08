import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, MoreThan, Repository } from 'typeorm'
import { normalizePhone } from '../common/phone.js'
import type { Env } from '../config/env.js'
import { Customer } from '../customers/customer.entity.js'
import { otpMessage } from '../notifications/messages.js'
import { SmsService } from '../notifications/sms.service.js'
import { TelegramGatewayService } from '../notifications/telegram-gateway.service.js'
import { OTP, SESSION_TTL_DAYS } from './auth.constants.js'
import { type OtpChannel, OtpCode } from './otp-code.entity.js'
import { Session } from './session.entity.js'

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

const parsePhone = (value: string) => {
  const phone = normalizePhone(value)
  if (!phone) throw new BadRequestException('Укажите корректный номер телефона')

  return phone
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(OtpCode) private readonly codes: Repository<OtpCode>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    private readonly config: ConfigService<Env, true>,
    private readonly sms: SmsService,
    private readonly telegram: TelegramGatewayService,
  ) {}

  async requestCode(rawPhone: string, preferred: 'auto' | 'sms' = 'auto') {
    const phone = parsePhone(rawPhone)
    const now = Date.now()
    const recent = await this.codes.find({
      where: { phone, createdAt: MoreThan(new Date(now - DAY_MS)) },
      order: { createdAt: 'DESC' },
    })
    const testCode = this.config.get('OTP_TEST_CODE', { infer: true })
    // The cooldown is per channel, so "send by SMS instead" works right after a Telegram code.
    const wantsSms = preferred === 'sms' || !this.telegram.isEnabled
    const last = testCode
      ? undefined
      : recent.find((item) => (wantsSms ? item.channel === 'sms' : item.channel === 'telegram'))
    const waitSeconds = last
      ? Math.ceil((last.createdAt.getTime() + OTP.resendSeconds * 1000 - now) / 1000)
      : 0
    if (waitSeconds > 0) {
      throw new HttpException(
        `Новый код можно запросить через ${waitSeconds} с`,
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
    if (!testCode && recent.length >= OTP.maxPerDay) {
      throw new HttpException(
        'Слишком много попыток. Попробуйте завтра',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const code = testCode ?? String(randomInt(0, 1_000_000)).padStart(6, '0')
    const telegramRequestId = wantsSms
      ? null
      : await this.telegram.sendCode(phone, code, OTP.ttlMinutes * 60)
    const channel: OtpChannel = telegramRequestId ? 'telegram' : 'sms'
    if (channel === 'sms') {
      try {
        await this.sms.send(phone, otpMessage(code))
      } catch {
        throw new ServiceUnavailableException('Не удалось отправить SMS. Попробуйте через минуту')
      }
    }

    await this.codes.save(
      this.codes.create({
        phone,
        codeHash: this.hashCode(phone, code),
        expiresAt: new Date(now + OTP.ttlMinutes * MINUTE_MS),
        channel,
        providerRequestId: telegramRequestId,
      }),
    )

    return { phone, channel, resendAfterSeconds: OTP.resendSeconds }
  }

  async verifyCode(rawPhone: string, code: string) {
    const phone = parsePhone(rawPhone)
    const otp = await this.codes.findOne({
      where: { phone, consumedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    })
    if (!otp || otp.attempts >= OTP.maxAttempts) {
      throw new BadRequestException('Код устарел — запросите новый')
    }

    const expected = Buffer.from(otp.codeHash, 'hex')
    const actual = Buffer.from(this.hashCode(phone, code), 'hex')
    if (!timingSafeEqual(expected, actual)) {
      await this.codes.increment({ id: otp.id }, 'attempts', 1)
      const left = OTP.maxAttempts - otp.attempts - 1
      throw new BadRequestException(
        left > 0 ? `Неверный код, осталось попыток: ${left}` : 'Код устарел — запросите новый',
      )
    }

    await this.codes.update({ id: otp.id }, { consumedAt: new Date() })
    if (otp.providerRequestId) void this.telegram.reportVerified(otp.providerRequestId, code)
    await this.customers.upsert(
      { phone },
      { conflictPaths: ['phone'], skipUpdateIfNoValuesChanged: true },
    )
    const customer = await this.customers.findOneByOrFail({ phone })
    const token = randomBytes(32).toString('base64url')
    await this.sessions.save(
      this.sessions.create({
        customerId: customer.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * DAY_MS),
      }),
    )

    return { token, customer }
  }

  async findCustomerBySession(token: string | undefined) {
    if (!token) return null
    const session = await this.sessions.findOne({
      where: { tokenHash: sha256(token), expiresAt: MoreThan(new Date()) },
      relations: { customer: true },
    })

    return session?.customer ?? null
  }

  async logout(token: string | undefined) {
    if (token) await this.sessions.delete({ tokenHash: sha256(token) })
  }

  private hashCode(phone: string, code: string) {
    return createHmac('sha256', this.config.get('AUTH_SECRET', { infer: true }))
      .update(`${phone}:${code}`)
      .digest('hex')
  }
}
