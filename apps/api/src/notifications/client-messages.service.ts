import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { BillingService } from '../billing/billing.service.js'
import { returnedRows } from '../common/sql.js'
import type { Env } from '../config/env.js'
import { clientStartParam, readClientStartParam } from './client-telegram.js'
import { SmsService } from './sms.service.js'
import { WhatsappService } from './whatsapp.service.js'
import type { WhatsappMessage } from './whatsapp-messages.js'

type Button = { text: string; url: string }

/** One message about a visit, in every shape a channel needs. */
type ClientMessage = {
  /** The SMS text (and Telegram's, without the link when it becomes a button). */
  text: string
  link?: { label: string; url: string }
  /** The approved WhatsApp template it maps to; without one WhatsApp is skipped. */
  whatsapp?: WhatsappMessage
  /**
   * The business whose month of SMS this counts against. Optional messages (reminders, review
   * requests, «Time to come back», the waitlist) are not sent by SMS past the plan's SMS and packs.
   */
  billing?: { businessId: string; isOptional: boolean }
}

const API_URL = 'https://api.telegram.org'

/**
 * What reaches a client about their visit: Telegram when their number is linked to a chat
 * (free, with buttons), then WhatsApp when it is on, otherwise SMS; a message WhatsApp refuses
 * goes by SMS. Never throws, like `SmsService.sendSafely`. Callers check the client's SMS
 * opt-out before calling, so it covers every channel.
 */
@Injectable()
export class ClientMessagesService {
  private readonly logger = new Logger(ClientMessagesService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly sms: SmsService,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService<Env, true>,
    private readonly plans: BillingService,
  ) {}

  /** The «Remind me in Telegram» link for a booking, or null without a bot. */
  linkUrl(bookingId: string) {
    const bot = this.config.get('TELEGRAM_BOT_USERNAME', { infer: true })
    if (!bot) return null
    return `https://t.me/${bot}?start=${clientStartParam(bookingId, this.secret())}`
  }

  /** Whether the bot's `/start <param>` is a client's link (the owners' codes look different). */
  isClientParam(param: string) {
    return readClientStartParam(param, this.secret()) !== null
  }

  /** `/start v…` from the bot: the booking's phone now gets its messages in this chat. */
  async link(chatId: string, param: string) {
    const bookingId = readClientStartParam(param, this.secret())
    if (!bookingId) return false
    const [booking] = (await this.dataSource.query(
      'SELECT "customer_phone" AS "phone" FROM "bookings" WHERE "id" = $1',
      [bookingId],
    )) as { phone: string }[]
    if (!booking) return false
    await this.dataSource.query(
      `INSERT INTO "client_telegram_chats" ("phone", "chat_id") VALUES ($1, $2)
       ON CONFLICT ("phone") DO UPDATE SET "chat_id" = EXCLUDED."chat_id", "created_at" = now()`,
      [booking.phone, chatId],
    )
    await this.sendTelegram(
      chatId,
      'Done: visit reminders will come here instead of by SMS. To turn this off, send /stop.',
    )
    return true
  }

  /** A number confirmed in the chat itself (Telegram sign-in): its messages go there too. */
  async linkPhone(chatId: string, phone: string) {
    await this.dataSource.query(
      `INSERT INTO "client_telegram_chats" ("phone", "chat_id") VALUES ($1, $2)
       ON CONFLICT ("phone") DO UPDATE SET "chat_id" = EXCLUDED."chat_id", "created_at" = now()`,
      [phone, chatId],
    )
  }

  async unlink(chatId: string) {
    const result = (await this.dataSource.query(
      'DELETE FROM "client_telegram_chats" WHERE "chat_id" = $1 RETURNING "phone"',
      [chatId],
    )) as unknown
    return returnedRows(result).length > 0
  }

  async isLinked(phone: string) {
    return (await this.chatFor(phone)) !== null
  }

  /** Telegram when linked (the link as a button), then WhatsApp, else the SMS text. */
  async send(phone: string, { text, link, whatsapp, billing }: ClientMessage) {
    try {
      const chatId = await this.chatFor(phone)
      if (chatId && this.token()) {
        // Telegram refuses buttons to http/localhost addresses: then the link stays in the text.
        const buttons = link?.url.startsWith('https://')
          ? [{ text: link.label, url: link.url }]
          : []
        const body = buttons.length && link ? text.replace(link.url, '').trim() : text
        if (await this.sendTelegram(chatId, body, buttons)) return
      }
      // The same countries as SMS: a number we would not text gets no WhatsApp either.
      if (whatsapp && this.whatsapp.isEnabled() && this.sms.canSendTo(phone)) {
        if (await this.whatsapp.send(phone, whatsapp)) return
      }
      if (billing && this.sms.canSendTo(phone)) {
        const hasSms = await this.plans.takeSms(billing.businessId, billing)
        if (!hasSms) {
          this.logger.log(`SMS skipped: the month's SMS of business ${billing.businessId} ran out`)
          return
        }
      }
      await this.sms.sendSafely(phone, text)
    } catch (error) {
      this.logger.warn(`Client message failed: ${String(error)}`)
    }
  }

  private async chatFor(phone: string) {
    const [row] = (await this.dataSource.query(
      'SELECT "chat_id" AS "chatId" FROM "client_telegram_chats" WHERE "phone" = $1',
      [phone],
    )) as { chatId: string }[]
    return row?.chatId ?? null
  }

  private async sendTelegram(chatId: string, text: string, buttons: Button[] = []) {
    const token = this.token()
    if (!token) {
      this.logger.log(`Telegram to client ${chatId}: ${text}`)
      return true
    }
    try {
      const response = await fetch(`${API_URL}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          link_preview_options: { is_disabled: true },
          ...(buttons.length ? { reply_markup: { inline_keyboard: [buttons] } } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      })
      const payload = (await response.json()) as { ok: boolean; description?: string }
      if (!payload.ok) throw new Error(payload.description ?? 'sendMessage failed')
      return true
    } catch (error) {
      // Blocked bot or a deleted chat: fall back to SMS this time.
      this.logger.warn(`Telegram to client failed: ${String(error)}`)
      return false
    }
  }

  private token() {
    return this.config.get('TELEGRAM_BOT_TOKEN', { infer: true })
  }

  private secret() {
    return this.config.get('AUTH_SECRET', { infer: true })
  }
}

export type { ClientMessage }
