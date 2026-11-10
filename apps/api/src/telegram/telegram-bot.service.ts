import { randomBytes } from 'node:crypto'
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, LessThan, Repository } from 'typeorm'
import { businessDateTimeToUtc, formatMinutes, toBusinessParts } from '../common/business-time.js'
import type { Env } from '../config/env.js'
import { TelegramChat } from './telegram-chat.entity.js'
import { TelegramLinkCode } from './telegram-link-code.entity.js'
import { type BookingLine, dayText, HELP_TEXT, linkedText } from './telegram-messages.js'

type Update = {
  update_id: number
  message?: {
    text?: string
    chat: { id: number }
    from?: { username?: string; first_name?: string }
  }
}

const API_URL = 'https://api.telegram.org'
const LINK_TTL_MS = 15 * 60_000
const POLL_TIMEOUT_SECONDS = 30
const RETRY_DELAY_MS = 5_000

// The owners' bot: links chats to a business and sends them what happens there.
// Without TELEGRAM_BOT_TOKEN messages are logged, like the console SMS driver.
@Injectable()
export class TelegramBotService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramBotService.name)
  private isPolling = false

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(TelegramChat) private readonly chats: Repository<TelegramChat>,
    @InjectRepository(TelegramLinkCode) private readonly codes: Repository<TelegramLinkCode>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  get isAvailable() {
    return Boolean(this.config.get('TELEGRAM_BOT_USERNAME', { infer: true }))
  }

  get botUsername() {
    return this.config.get('TELEGRAM_BOT_USERNAME', { infer: true }) ?? null
  }

  async onApplicationBootstrap() {
    const token = this.token()
    if (!token || this.config.get('NODE_ENV', { infer: true }) === 'test') return
    const webhookUrl = this.config.get('TELEGRAM_WEBHOOK_URL', { infer: true })
    if (webhookUrl) {
      await this.call('setWebhook', {
        url: webhookUrl,
        secret_token: this.config.get('TELEGRAM_WEBHOOK_SECRET', { infer: true }),
        allowed_updates: ['message'],
      }).catch((error: unknown) => this.logger.warn(`setWebhook failed: ${String(error)}`))
      return
    }
    // No public URL (local development): long polling, one instance only.
    await this.call('deleteWebhook', {}).catch(() => undefined)
    this.isPolling = true
    void this.poll(0)
  }

  onApplicationShutdown() {
    this.isPolling = false
  }

  async createLink(businessId: string, customerId: string | null) {
    await this.codes.delete({ expiresAt: LessThan(new Date()) })
    const code = randomBytes(12).toString('base64url')
    await this.codes.insert({
      code,
      businessId,
      customerId,
      expiresAt: new Date(Date.now() + LINK_TTL_MS),
    })

    return { url: `https://t.me/${this.botUsername}?start=${code}`, code }
  }

  listChats(businessId: string) {
    return this.chats.find({ where: { businessId }, order: { createdAt: 'ASC' } }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        username: row.username,
        createdAt: row.createdAt.toISOString(),
      })),
    )
  }

  async removeChat(businessId: string, id: string) {
    const chat = await this.chats.findOneBy({ id, businessId })
    if (!chat) return
    await this.chats.delete({ id })
    void this.send(chat.chatId, 'Уведомления отключены в кабинете.')
  }

  /** Sends to every chat linked to the business; never throws, like `sendSafely` for SMS. */
  async notifyBusiness(businessId: string, html: string) {
    try {
      const chats = await this.chats.findBy({ businessId })
      await Promise.all(chats.map((chat) => this.send(chat.chatId, html)))
    } catch (error) {
      this.logger.warn(`Telegram notify failed: ${String(error)}`)
    }
  }

  async handleUpdate(update: Update) {
    const message = update.message
    const text = message?.text?.trim()
    if (!message || !text) return
    const chatId = String(message.chat.id)
    const [command = '', argument = ''] = text.split(/\s+/)

    if (command === '/start' && argument) return this.link(chatId, argument, message.from)
    if (command === '/today') return this.sendToday(chatId)
    if (command === '/stop') {
      await this.chats.delete({ chatId })
      return this.send(chatId, 'Уведомления отключены. Подключить снова можно в кабинете.')
    }

    return this.send(chatId, HELP_TEXT)
  }

  // Every morning at 9:00 Bishkek time (03:00 UTC): the day's schedule in each linked chat.
  @Cron('0 3 * * *')
  async sendMorningDigest() {
    const chats = await this.chats.find()
    const businessIds = [...new Set(chats.map((chat) => chat.businessId))]
    for (const businessId of businessIds) {
      const digest = await this.dayDigest(businessId)
      if (digest) await this.notifyBusiness(businessId, digest)
    }
  }

  private async link(
    chatId: string,
    code: string,
    from?: { username?: string; first_name?: string },
  ) {
    const link = await this.codes.findOneBy({ code })
    if (!link || link.expiresAt < new Date()) {
      return this.send(
        chatId,
        'Ссылка устарела. Откройте кабинет и нажмите «Подключить Telegram» ещё раз.',
      )
    }
    await this.codes.delete({ code })
    await this.chats.upsert(
      {
        businessId: link.businessId,
        customerId: link.customerId,
        chatId,
        username: from?.username ?? from?.first_name ?? '',
      },
      ['businessId', 'chatId'],
    )
    const [business] = (await this.dataSource.query(
      'SELECT "name" FROM "businesses" WHERE "id" = $1',
      [link.businessId],
    )) as { name: string }[]

    return this.send(chatId, linkedText(business?.name ?? ''))
  }

  private async sendToday(chatId: string) {
    const chats = await this.chats.findBy({ chatId })
    if (chats.length === 0) return this.send(chatId, HELP_TEXT)
    for (const chat of chats) {
      const digest = await this.dayDigest(chat.businessId)
      if (digest) await this.send(chatId, digest)
    }
  }

  private async dayDigest(businessId: string) {
    const today = toBusinessParts(new Date()).dateKey
    const rows = (await this.dataSource.query(
      `SELECT bz."name" AS "business", b."starts_at" AS "startsAt", s."name" AS "serviceName",
         sp."name" AS "specialistName", b."customer_name" AS "customerName"
       FROM "businesses" bz
       LEFT JOIN "bookings" b ON b."business_id" = bz."id" AND b."status" = 'confirmed'
         AND b."starts_at" >= $2 AND b."starts_at" < $3
       LEFT JOIN "services" s ON s."id" = b."service_id"
       LEFT JOIN "specialists" sp ON sp."id" = b."specialist_id"
       WHERE bz."id" = $1
       ORDER BY b."starts_at"`,
      [businessId, businessDateTimeToUtc(today, 0), businessDateTimeToUtc(today, 24 * 60)],
    )) as {
      business: string
      startsAt: Date | null
      serviceName: string
      specialistName: string
      customerName: string
    }[]
    const [first] = rows
    if (!first) return null
    const bookings: BookingLine[] = rows
      .filter((row) => row.startsAt !== null)
      .map((row) => ({
        time: formatMinutes(toBusinessParts(new Date(row.startsAt as Date)).minutes),
        serviceName: row.serviceName,
        specialistName: row.specialistName,
        customerName: row.customerName,
      }))

    return dayText(first.business, today, bookings)
  }

  private async poll(offset: number): Promise<void> {
    if (!this.isPolling) return
    try {
      const updates = (await this.call('getUpdates', {
        offset,
        timeout: POLL_TIMEOUT_SECONDS,
        allowed_updates: ['message'],
      })) as Update[]
      let next = offset
      for (const update of updates) {
        next = update.update_id + 1
        await this.handleUpdate(update).catch((error: unknown) =>
          this.logger.warn(`Telegram update failed: ${String(error)}`),
        )
      }
      return this.poll(next)
    } catch (error) {
      this.logger.warn(`Telegram polling: ${String(error)}`)
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      return this.poll(offset)
    }
  }

  private async send(chatId: string, html: string) {
    if (!this.token()) {
      this.logger.log(`Telegram to ${chatId}: ${html}`)
      return
    }
    await this.call('sendMessage', {
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    }).catch((error: unknown) => this.logger.warn(`Telegram send failed: ${String(error)}`))
  }

  private token() {
    return this.config.get('TELEGRAM_BOT_TOKEN', { infer: true })
  }

  private async call(method: string, body: Record<string, unknown>) {
    const response = await fetch(`${API_URL}/bot${this.token()}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout((POLL_TIMEOUT_SECONDS + 10) * 1000),
    })
    const payload = (await response.json()) as {
      ok: boolean
      result?: unknown
      description?: string
    }
    if (!payload.ok) throw new Error(payload.description ?? `Telegram ${method} failed`)

    return payload.result
  }
}
