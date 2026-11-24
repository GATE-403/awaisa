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
import { readLoginStartParam } from '../auth/telegram-login.js'
import { TelegramLoginService } from '../auth/telegram-login.service.js'
import { visitNames, visitPrice } from '../bookings/visit-sql.js'
import { CacheService } from '../cache/cache.service.js'
import { businessDateTimeToUtc, formatMinutes, toBusinessParts } from '../common/business-time.js'
import { normalizePhone } from '../common/phone.js'
import { returnedRows } from '../common/sql.js'
import type { Env } from '../config/env.js'
import { ClientMessagesService } from '../notifications/client-messages.service.js'
import { DEFAULT_QUICK_REPLIES, fillReplyTemplate } from '../reviews/review-reply-text.js'
import { RuntimeService } from '../runtime/runtime.service.js'
import { businessWeekText } from './business-digest.js'
import { reviewDigestText } from './review-digest.js'
import {
  ALREADY_ANSWERED,
  NOT_YOURS,
  parseReviewCallback,
  REPLY_PLACEHOLDER,
  repliedText,
  replyPromptText,
} from './review-replies.js'
import { TelegramChat } from './telegram-chat.entity.js'
import { TelegramLinkCode } from './telegram-link-code.entity.js'
import {
  type BookingLine,
  dayText,
  HELP_TEXT,
  LOGIN_ASK_CONTACT,
  LOGIN_DONE,
  LOGIN_EXPIRED,
  LOGIN_NOT_OWN,
  LOGIN_REFUSED,
  LOGIN_SHARE_BUTTON,
  linkedText,
  loginKnownText,
  unclosedText,
} from './telegram-messages.js'

type Update = {
  update_id: number
  message?: {
    message_id?: number
    text?: string
    chat: { id: number }
    /** A reply to one of the bot's messages (the «write your reply» prompt). */
    reply_to_message?: { message_id: number }
    from?: { id?: number; username?: string; first_name?: string }
    /** «Поделиться номером»: `user_id` is whose number it is (a forwarded contact differs). */
    contact?: { phone_number: string; user_id?: number }
  }
  /** A press on an inline button (a quick reply or «Свой ответ» under a review). */
  callback_query?: {
    id: string
    data?: string
    message?: { message_id: number; chat: { id: number } }
  }
}

type ReplyMarkup = Record<string, unknown>

const API_URL = 'https://api.telegram.org'
const LINK_TTL_MS = 15 * 60_000
const POLL_TIMEOUT_SECONDS = 30
const RETRY_DELAY_MS = 5_000
// Messages, and presses on the inline buttons under a review.
const ALLOWED_UPDATES = ['message', 'callback_query']
const MAX_REPLY_LENGTH = 1000

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
    private readonly clientMessages: ClientMessagesService,
    private readonly telegramLogin: TelegramLoginService,
    private readonly runtime: RuntimeService,
    private readonly cache: CacheService,
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
    // The webhook is set and the long-poll runs from the jobs process only: Telegram allows one poller.
    if (!this.runtime.runsJobs) return
    const webhookUrl = this.config.get('TELEGRAM_WEBHOOK_URL', { infer: true })
    if (webhookUrl) {
      await this.call('setWebhook', {
        url: webhookUrl,
        secret_token: this.config.get('TELEGRAM_WEBHOOK_SECRET', { infer: true }),
        allowed_updates: ALLOWED_UPDATES,
      }).catch((error: unknown) => this.logger.warn(`setWebhook failed: ${String(error)}`))
      return
    }
    // No public URL (local development): long polling.
    await this.call('deleteWebhook', {}).catch(() => undefined)
    this.isPolling = true
    void this.poll(0)
  }

  /** Platform alerts (errors, Redis) to ALERT_TELEGRAM_CHAT_ID; logged when it is not set. */
  async sendAlert(html: string) {
    const chatId = this.config.get('ALERT_TELEGRAM_CHAT_ID', { infer: true })
    if (!chatId) {
      this.logger.warn(`Alert (no ALERT_TELEGRAM_CHAT_ID): ${html}`)
      return
    }
    await this.send(chatId, html)
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
  async notifyBusiness(businessId: string, html: string, replyMarkup?: ReplyMarkup) {
    try {
      const chats = await this.chats.findBy({ businessId })
      await Promise.all(chats.map((chat) => this.send(chat.chatId, html, replyMarkup)))
    } catch (error) {
      this.logger.warn(`Telegram notify failed: ${String(error)}`)
    }
  }

  async handleUpdate(update: Update) {
    if (update.callback_query) return this.handleButton(update.callback_query)
    const message = update.message
    if (message?.contact) return this.signInWithContact(message)
    if (message?.reply_to_message && message.text) {
      const isReviewReply = await this.replyFromPrompt(
        String(message.chat.id),
        message.reply_to_message.message_id,
        message.text,
      )
      if (isReviewReply) return
    }
    const text = message?.text?.trim()
    if (!message || !text) return
    const chatId = String(message.chat.id)
    const [command = '', argument = ''] = text.split(/\s+/)

    // «Войти через Telegram» on the site: ask for the person's own number.
    const loginToken = command === '/start' ? readLoginStartParam(argument) : null
    if (loginToken) {
      if (!(await this.telegramLogin.attachChat(loginToken, chatId))) {
        return this.send(chatId, LOGIN_EXPIRED)
      }
      // Shared here before: no need to ask again.
      const known = await this.telegramLogin.rememberedPhone(chatId)
      if (known && (await this.telegramLogin.confirmContact(chatId, known)) === 'confirmed') {
        return this.send(chatId, loginKnownText(known), { remove_keyboard: true })
      }
      return this.send(chatId, LOGIN_ASK_CONTACT, {
        keyboard: [[{ text: LOGIN_SHARE_BUTTON, request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      })
    }

    // Clients link from their booking (a signed «v…» parameter); owners from the cabinet.
    if (command === '/start' && argument && this.clientMessages.isClientParam(argument)) {
      const isLinked = await this.clientMessages.link(chatId, argument)
      if (!isLinked)
        return this.send(chatId, 'Запись не нашли - откройте ссылку из записи ещё раз.')
      return
    }
    if (command === '/start' && argument) return this.link(chatId, argument, message.from)
    if (command === '/today') return this.sendToday(chatId)
    // For ALERT_TELEGRAM_CHAT_ID: the platform's own alerts go to whichever chat this is.
    if (command === '/chatid') return this.send(chatId, `ID этого чата: <code>${chatId}</code>`)
    if (command === '/stop') {
      await this.telegramLogin.forgetChat(chatId)
      // A client's chat: back to SMS reminders.
      if (await this.clientMessages.unlink(chatId)) {
        return this.send(chatId, 'Напоминания снова будут приходить по SMS.')
      }
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

  // 20:00 Bishkek (14:00 UTC): a nudge to close today's visits, only where some are still open.
  @Cron('0 14 * * *')
  async sendUnclosedReminder() {
    const today = toBusinessParts(new Date()).dateKey
    const rows = (await this.dataSource.query(
      `SELECT b."business_id" AS "businessId", COUNT(*)::int AS "count"
       FROM "bookings" b
       WHERE b."status" = 'confirmed' AND b."outcome" IS NULL AND b."ends_at" < now()
         AND b."starts_at" >= $1 AND b."starts_at" < $2
         AND EXISTS (SELECT 1 FROM "telegram_chats" c WHERE c."business_id" = b."business_id")
       GROUP BY 1`,
      [businessDateTimeToUtc(today, 0), businessDateTimeToUtc(today, 24 * 60)],
    )) as { businessId: string; count: number }[]
    for (const row of rows) {
      await this.notifyBusiness(row.businessId, unclosedText(row.count))
    }
  }

  // Mondays at 10:00 Bishkek (04:00 UTC): the week in one message - the money, visits, the best
  // master, no-shows and what waits, then the week's reviews.
  @Cron('0 4 * * 1')
  async sendWeeklyDigest() {
    const weeks = await this.businessWeeks()
    const reviews = await this.reviewDigests()
    for (const businessId of new Set([...weeks.keys(), ...reviews.keys()])) {
      const parts = [weeks.get(businessId), reviews.get(businessId)].filter(Boolean)
      if (parts.length > 0) await this.notifyBusiness(businessId, parts.join('\n\n'))
    }
  }

  /** Each linked business's week in numbers (`businessWeekText`), keyed by business. */
  private async businessWeeks() {
    const done = `b."status" = 'confirmed' AND b."outcome" IS DISTINCT FROM 'no_show'`
    const earned = `COALESCE(b."paid_amount", ${visitPrice()} - COALESCE(b."discount_amount", 0))`
    const rows = (await this.dataSource.query(
      `WITH linked AS (SELECT DISTINCT "business_id" FROM "telegram_chats")
       SELECT bz."id" AS "businessId", bz."name" AS "business", bz."slug",
         COALESCE(SUM(${earned}) FILTER (WHERE ${done} AND b."starts_at" >= now() - interval '7 days'), 0)::int AS "revenue",
         COALESCE(SUM(${earned}) FILTER (WHERE ${done} AND b."starts_at" < now() - interval '7 days'), 0)::int AS "previousRevenue",
         COUNT(b."id") FILTER (WHERE ${done} AND b."starts_at" >= now() - interval '7 days')::int AS "visits",
         COUNT(b."id") FILTER (WHERE b."outcome" = 'no_show' AND b."starts_at" >= now() - interval '7 days')::int AS "noShows",
         COALESCE(SUM(${visitPrice()} - COALESCE(b."discount_amount", 0)) FILTER (WHERE b."outcome" = 'no_show'
           AND b."starts_at" >= now() - interval '7 days'), 0)::int AS "noShowAmount",
         (SELECT COUNT(*) FROM "bookings" u WHERE u."business_id" = bz."id" AND u."status" = 'confirmed'
            AND u."outcome" IS NULL AND u."ends_at" < now() AND u."starts_at" >= now() - interval '30 days')::int
           AS "unmarked",
         (SELECT json_build_object('name', sp."name", 'revenue', SUM(COALESCE(m."paid_amount", ${visitPrice('m', 'ms')} - COALESCE(m."discount_amount", 0))))
            FROM "bookings" m JOIN "services" ms ON ms."id" = m."service_id"
            JOIN "specialists" sp ON sp."id" = m."specialist_id"
            WHERE m."business_id" = bz."id" AND m."status" = 'confirmed'
              AND m."outcome" IS DISTINCT FROM 'no_show' AND m."starts_at" >= now() - interval '7 days'
              AND m."starts_at" < now()
            GROUP BY sp."id", sp."name"
            ORDER BY SUM(COALESCE(m."paid_amount", ${visitPrice('m', 'ms')} - COALESCE(m."discount_amount", 0))) DESC
            LIMIT 1) AS "bestMaster"
       FROM "businesses" bz
       JOIN linked l ON l."business_id" = bz."id"
       LEFT JOIN "bookings" b ON b."business_id" = bz."id"
         AND b."starts_at" >= now() - interval '14 days' AND b."starts_at" < now()
       LEFT JOIN "services" s ON s."id" = b."service_id"
       GROUP BY bz."id", bz."name", bz."slug"`,
    )) as {
      businessId: string
      business: string
      slug: string
      revenue: number
      previousRevenue: number
      visits: number
      noShows: number
      noShowAmount: number
      unmarked: number
      bestMaster: { name: string; revenue: number | string } | null
    }[]
    const web = this.config.get('PUBLIC_WEB_URL', { infer: true })
    const texts = new Map<string, string>()
    for (const row of rows) {
      const text = businessWeekText({
        business: row.business,
        revenue: row.revenue,
        previousRevenue: row.previousRevenue,
        visits: row.visits,
        bestMaster: row.bestMaster
          ? { name: row.bestMaster.name, revenue: Number(row.bestMaster.revenue) }
          : null,
        noShows: { count: row.noShows, amount: row.noShowAmount },
        unmarked: row.unmarked,
        analyticsUrl: `${web}/manage/${row.slug}?tab=analytics`,
      })
      if (text) texts.set(row.businessId, text)
    }

    return texts
  }

  /** Each linked business's week of reviews (`reviewDigestText`), keyed by business. */
  private async reviewDigests() {
    const rows = (await this.dataSource.query(
      `WITH linked AS (SELECT DISTINCT "business_id" FROM "telegram_chats")
       SELECT b."id" AS "businessId", b."name" AS "business", b."slug",
         COUNT(r."id") FILTER (WHERE r."created_at" >= now() - interval '7 days')::int AS "count",
         AVG(r."rating") FILTER (WHERE r."created_at" >= now() - interval '7 days') AS "average",
         AVG(r."rating") FILTER (WHERE r."created_at" >= now() - interval '14 days'
           AND r."created_at" < now() - interval '7 days') AS "previousAverage",
         COUNT(r."id") FILTER (WHERE r."reply" IS NULL AND r."rating" <= 3
           AND r."resolved_at" IS NULL)::int AS "poorOpen",
         COUNT(r."id") FILTER (WHERE r."reply" IS NULL)::int AS "unanswered",
         (SELECT json_build_object('name', sp."name", 'average', AVG(w."rating"), 'count', COUNT(*))
          FROM "reviews" w JOIN "specialists" sp ON sp."id" = w."specialist_id"
          WHERE w."business_id" = b."id" AND w."created_at" >= now() - interval '7 days'
          GROUP BY sp."id", sp."name" HAVING COUNT(*) >= 2
          ORDER BY AVG(w."rating") DESC, COUNT(*) DESC LIMIT 1) AS "bestMaster"
       FROM "businesses" b
       JOIN linked l ON l."business_id" = b."id"
       LEFT JOIN "reviews" r ON r."business_id" = b."id"
       GROUP BY b."id", b."name", b."slug"`,
    )) as {
      businessId: string
      business: string
      slug: string
      count: number
      average: string | null
      previousAverage: string | null
      poorOpen: number
      unanswered: number
      bestMaster: { name: string; average: number | string; count: number | string } | null
    }[]
    const web = this.config.get('PUBLIC_WEB_URL', { infer: true })
    const texts = new Map<string, string>()
    for (const row of rows) {
      const text = reviewDigestText({
        business: row.business,
        count: row.count,
        average: row.average === null ? null : Number(row.average),
        previousAverage: row.previousAverage === null ? null : Number(row.previousAverage),
        bestMaster: row.bestMaster
          ? {
              name: row.bestMaster.name,
              average: Number(row.bestMaster.average),
              count: Number(row.bestMaster.count),
            }
          : null,
        poorOpen: row.poorOpen,
        unanswered: row.unanswered,
        cabinetUrl: `${web}/manage/${row.slug}?tab=reviews`,
      })
      if (text) texts.set(row.businessId, text)
    }

    return texts
  }

  /** A button under a review: publish a quick reply, or ask for the owner's own words. */
  private async handleButton(query: NonNullable<Update['callback_query']>) {
    const action = parseReviewCallback(query.data)
    const chatId = query.message ? String(query.message.chat.id) : null
    if (!action || !chatId) return this.answerButton(query.id)
    const review = await this.reviewForChat(chatId, action.reviewId)
    if (!review) return this.answerButton(query.id, NOT_YOURS)
    if (review.reply) return this.answerButton(query.id, ALREADY_ANSWERED)

    if (action.kind === 'own') {
      await this.answerButton(query.id)
      const messageId = await this.send(chatId, replyPromptText(review.authorName, review.rating), {
        force_reply: true,
        input_field_placeholder: REPLY_PLACEHOLDER,
      })
      if (messageId === null) return
      await this.dataSource.query(
        `INSERT INTO "telegram_reply_prompts" ("chat_id", "message_id", "review_id")
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [chatId, messageId, review.id],
      )
      return
    }

    const [settings] = (await this.dataSource.query(
      'SELECT "quick_replies" AS "quickReplies" FROM "review_reply_settings" WHERE "business_id" = $1',
      [review.businessId],
    )) as { quickReplies: string[] }[]
    const template = (settings?.quickReplies ?? DEFAULT_QUICK_REPLIES)[action.index]
    if (!template) return this.answerButton(query.id)
    const text = fillReplyTemplate(template, review)
    if (!(await this.saveReply(review.id, text)))
      return this.answerButton(query.id, ALREADY_ANSWERED)
    await this.answerButton(query.id, 'Ответ опубликован')
    // The buttons go, so the same review is not answered twice from an old message.
    if (query.message) {
      await this.call('editMessageReplyMarkup', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: [] },
      }).catch(() => undefined)
    }
    await this.send(chatId, repliedText(text))
  }

  /** The owner's reply to the bot's «write your reply» prompt; false when it is not one. */
  private async replyFromPrompt(chatId: string, promptId: number, text: string) {
    const [prompt] = (await this.dataSource.query(
      `SELECT "review_id" AS "reviewId" FROM "telegram_reply_prompts"
       WHERE "chat_id" = $1 AND "message_id" = $2`,
      [chatId, promptId],
    )) as { reviewId: string }[]
    if (!prompt) return false
    const review = await this.reviewForChat(chatId, prompt.reviewId)
    if (!review) return true
    const reply = text.trim().slice(0, MAX_REPLY_LENGTH)
    if (!reply) return true
    if (!(await this.saveReply(review.id, reply))) {
      await this.send(chatId, ALREADY_ANSWERED)
      return true
    }
    await this.dataSource.query('DELETE FROM "telegram_reply_prompts" WHERE "review_id" = $1', [
      review.id,
    ])
    await this.send(chatId, repliedText(reply))
    return true
  }

  /** The review, only when this chat is linked to the business it belongs to. */
  private async reviewForChat(chatId: string, reviewId: string) {
    const [review] = (await this.dataSource.query(
      `SELECT r."id", r."business_id" AS "businessId", r."author_name" AS "authorName",
         r."rating", r."reply", COALESCE(sp."name", '') AS "specialistName",
         COALESCE(s."name", '') AS "serviceName"
       FROM "reviews" r
       LEFT JOIN "specialists" sp ON sp."id" = r."specialist_id"
       LEFT JOIN "services" s ON s."id" = r."service_id"
       WHERE r."id" = $1 AND EXISTS (
         SELECT 1 FROM "telegram_chats" c WHERE c."chat_id" = $2 AND c."business_id" = r."business_id"
       )`,
      [reviewId, chatId],
    )) as {
      id: string
      businessId: string
      authorName: string
      rating: number
      reply: string | null
      specialistName: string
      serviceName: string
    }[]

    return review ? { ...review, rating: Number(review.rating) } : null
  }

  /** The owner's words as the review's reply, only if nobody answered meanwhile. */
  private async saveReply(reviewId: string, text: string) {
    const result: unknown = await this.dataSource.query(
      `UPDATE "reviews" SET "reply" = $1, "replied_at" = now(), "is_auto_reply" = false
       WHERE "id" = $2 AND "reply" IS NULL RETURNING "id"`,
      [text, reviewId],
    )
    const isSaved = returnedRows(result).length > 0
    // The public page shows replies; the bot's writes do not pass the cache interceptor.
    if (isSaved) await this.cache.bump(['catalog'])

    return isSaved
  }

  private async answerButton(queryId: string, text?: string) {
    if (!this.token()) return
    await this.call('answerCallbackQuery', {
      callback_query_id: queryId,
      ...(text ? { text } : {}),
    }).catch(() => undefined)
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

  private async signInWithContact(message: NonNullable<Update['message']>) {
    const chatId = String(message.chat.id)
    const contact = message.contact
    if (!contact) return
    // Only the person's own number signs them in, never a contact they forwarded.
    if (!message.from?.id || contact.user_id !== message.from.id) {
      return this.send(chatId, LOGIN_NOT_OWN)
    }
    const result = await this.telegramLogin.confirmContact(chatId, contact.phone_number)
    const removeKeyboard = { remove_keyboard: true }
    if (result === 'refused') return this.send(chatId, LOGIN_REFUSED, removeKeyboard)
    if (result === 'none') return this.send(chatId, LOGIN_EXPIRED, removeKeyboard)
    const phone = normalizePhone(contact.phone_number)
    if (phone) await this.clientMessages.linkPhone(chatId, phone)
    return this.send(chatId, LOGIN_DONE, removeKeyboard)
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
      `SELECT bz."name" AS "business", b."starts_at" AS "startsAt", ${visitNames()} AS "serviceName",
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
        allowed_updates: ALLOWED_UPDATES,
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

  /** Sends one message; its id (for prompts to be replied to), or null when it was not sent. */
  private async send(chatId: string, html: string, replyMarkup?: ReplyMarkup) {
    if (!this.token()) {
      this.logger.log(`Telegram to ${chatId}: ${html}`)
      return null
    }
    const sent = (await this.call('sendMessage', {
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }).catch((error: unknown) => {
      this.logger.warn(`Telegram send failed: ${String(error)}`)
      return null
    })) as { message_id?: number } | null

    return sent?.message_id ?? null
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
