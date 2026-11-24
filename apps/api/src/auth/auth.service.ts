import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, MoreThan, Repository } from 'typeorm'
import { hashToken } from '../common/hash.js'
import { normalizePhone } from '../common/phone.js'
import type { Env } from '../config/env.js'
import { Customer } from '../customers/customer.entity.js'
import { SmsService } from '../notifications/sms.service.js'
import { TelegramGatewayService } from '../notifications/telegram-gateway.service.js'
import { OTP, SESSION_TTL_DAYS } from './auth.constants.js'
import { OtpCode } from './otp-code.entity.js'
import { Session } from './session.entity.js'

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

const parsePhone = (value: string) => {
  const phone = normalizePhone(value)
  if (!phone) throw new BadRequestException('Enter a valid phone number')

  return phone
}

// Codes go to Telegram only (the Telegram Gateway), never by SMS: SMS cost tens of times more.
// Without a gateway the code is only logged, outside production (development, e2e).
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectRepository(OtpCode) private readonly codes: Repository<OtpCode>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    private readonly config: ConfigService<Env, true>,
    private readonly sms: SmsService,
    private readonly telegram: TelegramGatewayService,
  ) {}

  /** Whether a code can reach anyone: the gateway is set, or codes are only logged here. */
  get isCodeAvailable() {
    return this.telegram.isEnabled || this.isLoggingCodes
  }

  async requestCode(rawPhone: string) {
    const phone = parsePhone(rawPhone)
    // Codes cost money: none go where messages are off (SMS_ALLOWED_COUNTRY_CODES).
    if (!this.sms.canSendTo(phone)) {
      const codes = this.config.get('SMS_ALLOWED_COUNTRY_CODES', { infer: true })
      throw new BadRequestException(
        `Sign-in is only available for numbers starting ${codes.map((code) => `+${code}`).join(', ')}`,
      )
    }
    if (!this.isCodeAvailable) {
      throw new ServiceUnavailableException(
        "We can't send a code to Telegram right now. Sign in with the Telegram bot",
      )
    }
    const now = Date.now()
    const recent = await this.codes.find({
      where: { phone, createdAt: MoreThan(new Date(now - DAY_MS)) },
      order: { createdAt: 'DESC' },
    })
    const testCode = this.config.get('OTP_TEST_CODE', { infer: true })
    const last = testCode ? undefined : recent[0]
    const waitSeconds = last
      ? Math.ceil((last.createdAt.getTime() + OTP.resendSeconds * 1000 - now) / 1000)
      : 0
    if (waitSeconds > 0) {
      throw new HttpException(
        `You can request a new code in ${waitSeconds} s`,
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
    if (!testCode && recent.length >= OTP.maxPerDay) {
      throw new HttpException('Too many attempts. Try again tomorrow', HttpStatus.TOO_MANY_REQUESTS)
    }

    const code = testCode ?? String(randomInt(0, 1_000_000)).padStart(6, '0')
    let providerRequestId: string | null = null
    if (this.isLoggingCodes) {
      this.logger.log(`[not sent to Telegram] Sign-in code for ${phone}: ${code}`)
    } else {
      providerRequestId = await this.telegram.sendCode(phone, code, OTP.ttlMinutes * 60)
      if (!providerRequestId) {
        throw new BadRequestException(
          'Could not send a code to Telegram for this number. Check the number or sign in with the Telegram bot',
        )
      }
    }

    await this.codes.save(
      this.codes.create({
        phone,
        codeHash: this.hashCode(phone, code),
        expiresAt: new Date(now + OTP.ttlMinutes * MINUTE_MS),
        channel: 'telegram',
        providerRequestId,
      }),
    )

    return { phone, channel: 'telegram' as const, resendAfterSeconds: OTP.resendSeconds }
  }

  async verifyCode(rawPhone: string, code: string) {
    const phone = parsePhone(rawPhone)
    const otp = await this.codes.findOne({
      where: { phone, consumedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    })
    if (!otp) throw new BadRequestException('The code has expired, request a new one')
    // The attempt is taken before the code is compared, in one statement: parallel guesses
    // cannot all read «0 attempts» and try far more than five codes.
    const taken = await this.codes
      .createQueryBuilder()
      .update()
      .set({ attempts: () => '"attempts" + 1' })
      .where('id = :id AND attempts < :max', { id: otp.id, max: OTP.maxAttempts })
      .returning(['attempts'])
      .execute()
    const attempts = (taken.raw as { attempts: number }[])[0]?.attempts
    if (attempts === undefined)
      throw new BadRequestException('The code has expired, request a new one')

    const expected = Buffer.from(otp.codeHash, 'hex')
    const actual = Buffer.from(this.hashCode(phone, code), 'hex')
    if (!timingSafeEqual(expected, actual)) {
      const left = OTP.maxAttempts - attempts
      throw new BadRequestException(
        left > 0 ? `Wrong code, attempts left: ${left}` : 'The code has expired, request a new one',
      )
    }

    await this.codes.update({ id: otp.id }, { consumedAt: new Date() })
    if (otp.providerRequestId) void this.telegram.reportVerified(otp.providerRequestId, code)

    return this.openSession(phone)
  }

  /** A verified number signs in: the customer is created when new, and a session opens. */
  async openSession(phone: string) {
    const blocked = (await this.customers.query(
      'SELECT 1 FROM "moderated_people" WHERE "phone" = $1 AND "blocked_at" IS NOT NULL',
      [phone],
    )) as unknown[]
    if (blocked.length > 0)
      throw new ForbiddenException('This number has been blocked by a moderator')
    await this.customers.upsert(
      { phone },
      { conflictPaths: ['phone'], skipUpdateIfNoValuesChanged: true },
    )
    const customer = await this.customers.findOneByOrFail({ phone })
    const token = randomBytes(32).toString('base64url')
    await this.sessions.save(
      this.sessions.create({
        customerId: customer.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * DAY_MS),
      }),
    )

    return { token, customer }
  }

  async findCustomerBySession(token: string | undefined) {
    if (!token) return null
    const session = await this.sessions.findOne({
      where: { tokenHash: hashToken(token), expiresAt: MoreThan(new Date()) },
      relations: { customer: true },
    })

    return session?.customer ?? null
  }

  async logout(token: string | undefined) {
    if (token) await this.sessions.delete({ tokenHash: hashToken(token) })
  }

  // A fixed test code, or no gateway outside production: the code goes to the log, not Telegram.
  private get isLoggingCodes() {
    if (this.config.get('OTP_TEST_CODE', { infer: true })) return true
    if (this.telegram.isEnabled) return false
    return this.config.get('NODE_ENV', { infer: true }) !== 'production'
  }

  private hashCode(phone: string, code: string) {
    return createHmac('sha256', this.config.get('AUTH_SECRET', { infer: true }))
      .update(`${phone}:${code}`)
      .digest('hex')
  }
}
