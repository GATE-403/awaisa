import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { maskPhone } from '../common/phone.js'
import type { Env } from '../config/env.js'
import { renderWhatsapp, toWhatsappPayload, type WhatsappMessage } from './whatsapp-messages.js'

const GRAPH_API = 'https://graph.facebook.com'

/**
 * Template messages through Meta's WhatsApp Business Cloud API. `send` reports whether the
 * message was accepted; the caller falls back to SMS when it was not. Never throws.
 */
@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name)

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit() {
    const driver = this.driver()
    const notes = {
      meta: 'WhatsApp driver: meta, client messages are sent through the Cloud API',
      log: 'WhatsApp driver: log, client messages are only logged, nothing is sent',
      off: 'WhatsApp driver: off, client messages go by SMS',
    }
    this.logger.log(notes[driver])
  }

  isEnabled() {
    return this.driver() !== 'off'
  }

  async send(to: string, message: WhatsappMessage) {
    const payload = toWhatsappPayload(message, {
      to,
      language: this.config.get('WHATSAPP_LANGUAGE', { infer: true }),
      webUrl: this.config.get('PUBLIC_WEB_URL', { infer: true }),
    })
    if (!payload) {
      this.logger.warn(`WhatsApp ${message.template}: the link is not on PUBLIC_WEB_URL, using SMS`)
      return false
    }
    if (this.driver() === 'log') {
      this.logger.log(
        `[not sent, log driver] WhatsApp ${message.template} to ${to}: ${renderWhatsapp(message)}`,
      )
      return true
    }

    try {
      await this.post(payload)
      this.logger.log(`WhatsApp ${message.template} sent to ${maskPhone(to)}`)
      return true
    } catch (error) {
      // Not on WhatsApp, a template not approved yet, a token gone stale, an outage: SMS goes instead.
      this.logger.warn(
        `WhatsApp ${message.template} to ${maskPhone(to)} failed: ${(error as Error).message}`,
      )
      return false
    }
  }

  private async post(payload: object) {
    const version = this.config.get('WHATSAPP_API_VERSION', { infer: true })
    const numberId = this.config.get('WHATSAPP_PHONE_NUMBER_ID', { infer: true })
    const response = await fetch(`${GRAPH_API}/${version}/${numberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.get('WHATSAPP_TOKEN', { infer: true })}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
    if (response.ok) return

    const body = (await response.json().catch(() => null)) as {
      error?: { code?: number; message?: string }
    } | null
    throw new Error(
      `Graph API ${response.status} ${body?.error?.code ?? ''}: ${body?.error?.message ?? 'unknown'}`,
    )
  }

  private driver() {
    return this.config.get('WHATSAPP_DRIVER', { infer: true })
  }
}
