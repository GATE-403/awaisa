import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { maskPhone } from '../common/phone.js'
import type { Env } from '../config/env.js'

type GatewayResponse<Result> = { ok: true; result: Result } | { ok: false; error: string }

type RequestStatus = {
  request_id: string
  request_cost?: number
}

const GATEWAY_API = 'https://gatewayapi.telegram.org'
const REQUEST_TIMEOUT_MS = 8_000

@Injectable()
export class TelegramGatewayService {
  private readonly logger = new Logger(TelegramGatewayService.name)

  constructor(private readonly config: ConfigService<Env, true>) {}

  get isEnabled() {
    return Boolean(this.token())
  }

  // Returns the request id, or null when the number can't get the code in Telegram (no account,
  // gateway error) — the caller then falls back to SMS.
  async sendCode(phone: string, code: string, ttlSeconds: number): Promise<string | null> {
    if (!this.isEnabled) return null

    try {
      // checkSendAbility charges the fee; sending with its request_id is then free.
      const ability = await this.call<RequestStatus>('checkSendAbility', { phone_number: phone })
      const sent = await this.call<RequestStatus>('sendVerificationMessage', {
        phone_number: phone,
        request_id: ability.request_id,
        code,
        ttl: ttlSeconds,
      })
      this.logger.log(`Code sent via Telegram to ${maskPhone(phone)}`)

      return sent.request_id
    } catch (error) {
      this.logger.warn(`Telegram unavailable for ${maskPhone(phone)}: ${(error as Error).message}`)
      return null
    }
  }

  // Tells Telegram the code was used, which feeds their conversion stats; failures don't matter.
  async reportVerified(requestId: string, code: string) {
    if (!this.isEnabled) return

    await this.call('checkVerificationStatus', { request_id: requestId, code }).catch(
      () => undefined,
    )
  }

  private token() {
    return this.config.get('TELEGRAM_GATEWAY_TOKEN', { infer: true })
  }

  private async call<Result>(method: string, body: Record<string, unknown>): Promise<Result> {
    const response = await fetch(`${GATEWAY_API}/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const data = (await response.json().catch(() => null)) as GatewayResponse<Result> | null
    if (!data) throw new Error(`HTTP ${response.status}`)
    if (!data.ok) throw new Error(data.error)

    return data.result
  }
}
