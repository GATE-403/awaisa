import type { PushConfig, PushMessage, PushSubscriptionInput } from '@awaisa/contracts'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import webPush, { WebPushError } from 'web-push'
import { toBusinessParts } from '../common/business-time.js'
import type { Env } from '../config/env.js'
import {
  chunk,
  EXPO_BATCH_SIZE,
  EXPO_PUSH_URL,
  parseExpoResponse,
  toExpoMessage,
} from './expo-push.js'
import {
  type Audience,
  type BookingEvent,
  bookingPushMessage,
  type PushBooking,
} from './push-messages.js'
import { type PushKind, PushSubscription } from './push-subscription.entity.js'

// A booking notice older than this is no news: the push service drops it instead of waking a
// phone hours later.
const TTL_SECONDS = 60 * 60

// The push service says the browser unsubscribed or the address never existed: forget it.
const GONE_STATUSES = new Set([404, 410])

// An answer from the Expo push service later than this is not waited for.
const EXPO_TIMEOUT_MS = 10_000

type Recipient = {
  id: string
  kind: PushKind
  endpoint: string
  p256dh: string | null
  auth: string | null
  audience: Audience
}

type Delivery = { recipient: Recipient; message: PushMessage }

/**
 * Pushes to the business side: the owner and administrators hear about every client booking,
 * a master signed in by phone only about visits with them. Browsers get Web Push, the Expo app
 * its own pushes through the Expo push service; the same text either way. Without VAPID keys
 * (browsers) or `EXPO_ACCESS_TOKEN` (the app) that kind only logs, and `/push/config` says it is
 * unavailable, so the web hides the switch.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name)
  private readonly publicKey: string | null
  private readonly expoAccessToken: string | null

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptions: Repository<PushSubscription>,
    private readonly dataSource: DataSource,
    config: ConfigService<Env, true>,
  ) {
    const publicKey = config.get('VAPID_PUBLIC_KEY', { infer: true })
    const privateKey = config.get('VAPID_PRIVATE_KEY', { infer: true })
    const subject = config.get('VAPID_SUBJECT', { infer: true })
    this.publicKey = publicKey && privateKey && subject ? publicKey : null
    if (this.publicKey && privateKey && subject) {
      webPush.setVapidDetails(subject, this.publicKey, privateKey)
    }
    this.expoAccessToken = config.get('EXPO_ACCESS_TOKEN', { infer: true }) ?? null
  }

  get config(): PushConfig {
    return {
      isAvailable: this.publicKey !== null,
      publicKey: this.publicKey,
      isNativeAvailable: this.expoAccessToken !== null,
    }
  }

  // One browser is one row: signing in as someone else on it moves the row to them.
  async subscribe(customerId: string, input: PushSubscriptionInput, userAgent: string) {
    await this.subscriptions.upsert(
      {
        customerId,
        kind: 'web',
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: userAgent.slice(0, 256),
      },
      ['endpoint'],
    )
  }

  async unsubscribe(customerId: string, endpoint: string) {
    await this.subscriptions.delete({ customerId, endpoint, kind: 'web' })
  }

  // The app's token is one row too: the phone follows whoever signed in on it last.
  async saveExpoToken(customerId: string, token: string, userAgent: string) {
    await this.subscriptions.upsert(
      {
        customerId,
        kind: 'expo',
        endpoint: token,
        p256dh: null,
        auth: null,
        userAgent: userAgent.slice(0, 256),
      },
      ['endpoint'],
    )
  }

  async deleteExpoToken(customerId: string, token: string) {
    await this.subscriptions.delete({ customerId, endpoint: token, kind: 'expo' })
  }

  /** Tells the business's people and the visit's master; never throws (bookings never fail on it). */
  async notifyBooking(
    event: BookingEvent,
    booking: PushBooking & { specialistId: string },
    businessId: string,
  ) {
    try {
      const recipients = await this.recipients(businessId, booking.specialistId)
      if (recipients.length === 0) return
      const today = toBusinessParts(new Date()).dateKey
      const deliveries = recipients.map((recipient) => ({
        recipient,
        message: bookingPushMessage(event, booking, recipient.audience, today),
      }))
      await Promise.all([
        ...deliveries
          .filter((delivery) => delivery.recipient.kind === 'web')
          .map((delivery) => this.send(delivery.recipient, delivery.message)),
        this.sendExpo(deliveries.filter((delivery) => delivery.recipient.kind === 'expo')),
      ])
    } catch (error) {
      this.logger.warn(`Push notify failed: ${String(error)}`)
    }
  }

  // Members of the business, then the master by their sign-in phone; someone who is both hears
  // once, as a member (the cabinet shows more than «Мой день»).
  private recipients(businessId: string, specialistId: string) {
    return this.dataSource.query(
      `SELECT DISTINCT ON (s."endpoint") s."id", s."kind", s."endpoint", s."p256dh", s."auth", r."audience"
       FROM "push_subscriptions" s
       JOIN (
         SELECT m."customer_id", 'member' AS "audience", 0 AS "rank"
         FROM "business_members" m WHERE m."business_id" = $1
         UNION ALL
         SELECT c."id", 'master', 1
         FROM "specialists" sp JOIN "customers" c ON c."phone" = sp."phone"
         WHERE sp."id" = $2 AND sp."business_id" = $1 AND sp."is_active"
       ) r ON r."customer_id" = s."customer_id"
       ORDER BY s."endpoint", r."rank"`,
      [businessId, specialistId],
    ) as Promise<Recipient[]>
  }

  private async send(recipient: Recipient, message: PushMessage) {
    if (!this.publicKey) {
      this.logger.log(`Push to ${recipient.id}: ${message.title} · ${message.body}`)
      return
    }
    try {
      const keys = { p256dh: recipient.p256dh ?? '', auth: recipient.auth ?? '' }
      await webPush.sendNotification(
        { endpoint: recipient.endpoint, keys },
        JSON.stringify(message),
        { TTL: TTL_SECONDS, urgency: 'high' },
      )
      await this.subscriptions.update({ id: recipient.id }, { lastSuccessAt: new Date() })
    } catch (error) {
      if (error instanceof WebPushError && GONE_STATUSES.has(error.statusCode)) {
        await this.subscriptions.delete({ id: recipient.id })
        return
      }
      this.logger.warn(`Push failed: ${String(error)}`)
    }
  }

  // The app's pushes go to Expo in batches of a hundred; a dead token is forgotten like a gone
  // browser subscription.
  private async sendExpo(deliveries: Delivery[]) {
    if (deliveries.length === 0) return
    if (!this.expoAccessToken) {
      for (const { recipient, message } of deliveries) {
        this.logger.log(`App push to ${recipient.id}: ${message.title} · ${message.body}`)
      }
      return
    }
    for (const batch of chunk(deliveries, EXPO_BATCH_SIZE)) {
      await this.sendExpoBatch(batch)
    }
  }

  private async sendExpoBatch(batch: Delivery[]) {
    const tokens = batch.map((delivery) => delivery.recipient.endpoint)
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Bearer ${this.expoAccessToken}`,
        },
        body: JSON.stringify(
          batch.map(({ recipient, message }) =>
            toExpoMessage(recipient.endpoint, message, TTL_SECONDS),
          ),
        ),
        signal: AbortSignal.timeout(EXPO_TIMEOUT_MS),
      })
      const answer: unknown = await response.json().catch(() => null)
      const result = parseExpoResponse(tokens, answer)
      for (const error of result.errors) this.logger.warn(error)
      if (result.gone.length > 0) {
        await this.subscriptions.delete({ kind: 'expo', endpoint: In(result.gone) })
      }
      if (result.sent.length > 0) {
        await this.subscriptions.update(
          { kind: 'expo', endpoint: In(result.sent) },
          { lastSuccessAt: new Date() },
        )
      }
    } catch (error) {
      this.logger.warn(`App push failed: ${String(error)}`)
    }
  }
}
