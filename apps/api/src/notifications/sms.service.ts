import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { isAllowedDestination, maskPhone } from '../common/phone.js'
import type { Env } from '../config/env.js'

const TWILIO_API = 'https://api.twilio.com/2010-04-01'

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name)

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit() {
    const driver = this.config.get('SMS_DRIVER', { infer: true })
    this.logger.log(
      driver === 'twilio'
        ? 'SMS driver: twilio — messages are sent'
        : 'SMS driver: console — messages are only logged, nothing is sent',
    )
  }

  /** Whether texts may go to this number at all (SMS_ALLOWED_COUNTRY_CODES). */
  canSendTo(phone: string) {
    return isAllowedDestination(
      phone,
      this.config.get('SMS_ALLOWED_COUNTRY_CODES', { infer: true }),
    )
  }

  async send(to: string, body: string) {
    // Refused in development too, so a number that gets no SMS in production gets none here.
    if (!this.canSendTo(to)) throw new Error(`SMS to ${maskPhone(to)} is off for its country`)
    if (this.config.get('SMS_DRIVER', { infer: true }) === 'console') {
      this.logger.log(`[not sent, console driver] SMS to ${to}: ${body}`)
      return
    }

    await this.sendWithTwilio(to, body)
    this.logger.log(`SMS sent via Twilio to ${maskPhone(to)}`)
  }

  async sendSafely(to: string, body: string) {
    if (!this.canSendTo(to)) {
      this.logger.log(
        `SMS to ${maskPhone(to)} skipped: its country is not in SMS_ALLOWED_COUNTRY_CODES`,
      )
      return
    }
    try {
      await this.send(to, body)
    } catch (error) {
      this.logger.error(`SMS to ${maskPhone(to)} failed: ${(error as Error).message}`)
    }
  }

  private async sendWithTwilio(to: string, body: string) {
    const accountSid = this.config.get('TWILIO_ACCOUNT_SID', { infer: true }) ?? ''
    const authToken = this.config.get('TWILIO_AUTH_TOKEN', { infer: true }) ?? ''
    const messagingServiceSid = this.config.get('TWILIO_MESSAGING_SERVICE_SID', { infer: true })
    const from = this.config.get('TWILIO_FROM', { infer: true })
    const form = new URLSearchParams({ To: to, Body: body })
    if (messagingServiceSid) form.set('MessagingServiceSid', messagingServiceSid)
    else if (from) form.set('From', from)

    const response = await fetch(`${TWILIO_API}/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
      signal: AbortSignal.timeout(10_000),
    })
    if (response.ok) return

    const error = (await response.json().catch(() => null)) as {
      code?: number
      message?: string
    } | null
    throw new Error(
      `Twilio ${response.status} ${error?.code ?? ''}: ${error?.message ?? 'unknown'}`,
    )
  }
}
