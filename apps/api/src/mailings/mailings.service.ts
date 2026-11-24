import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { BillingService, PlanRequiredException } from '../billing/billing.service.js'
import type { Business } from '../businesses/business.entity.js'
import { toBusinessParts } from '../common/business-time.js'
import type { Env } from '../config/env.js'
import { SmsService } from '../notifications/sms.service.js'
import { renderMailing } from './mailing-text.js'

type Segment = 'lapsed' | 'birthday' | 'all'

type Recipient = { phone: string; name: string; birthday: string | null }

const MAX_RECIPIENTS = 1000
const BIRTHDAY_WINDOW_DAYS = 7

/** Days from `today` (MM-DD) to the next `birthday` (YYYY-MM-DD), across the new year. */
const daysUntilBirthday = (birthday: string, today: string) => {
  const [year = 2000, month = 1, day = 1] = today.split('-').map(Number)
  const [, birthMonth = 1, birthDay = 1] = birthday.split('-').map(Number)
  const start = Date.UTC(year, month - 1, day)
  let next = Date.UTC(year, birthMonth - 1, birthDay)
  if (next < start) next = Date.UTC(year + 1, birthMonth - 1, birthDay)
  return Math.round((next - start) / 86_400_000)
}

/**
 * SMS mailings to the client base. Only clients who kept SMS on in their latest booking get
 * them. Segments: «Haven't been for a while» (no visit for N days and nothing booked), birthdays in the
 * coming week, everyone. The same segment goes out at most once a day.
 */
@Injectable()
export class MailingsService {
  private readonly logger = new Logger(MailingsService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly sms: SmsService,
    private readonly config: ConfigService<Env, true>,
    private readonly billing: BillingService,
  ) {}

  async preview(businessId: string, segment: Segment, days: number) {
    const recipients = await this.recipients(businessId, segment, days)
    return {
      count: recipients.length,
      names: recipients.slice(0, 5).map((recipient) => recipient.name),
    }
  }

  async send(business: Business, segment: Segment, days: number, text: string) {
    const [recent] = await this.query(
      `SELECT 1 FROM "mailings" WHERE "business_id" = $1 AND "segment" = $2
         AND "created_at" > now() - interval '20 hours' LIMIT 1`,
      [business.id, segment],
    )
    if (recent)
      throw new ConflictException('This mailing already went out today: try again tomorrow')
    const recipients = (await this.recipients(business.id, segment, days)).slice(0, MAX_RECIPIENTS)
    // A mailing goes whole or not at all: past the month's SMS and packs it is refused.
    const left = await this.billing.smsLeft(business.id)
    if (left !== null && recipients.length > left) {
      throw new PlanRequiredException(
        `You have ${left} SMS left this month, and the mailing is for ${recipients.length}. You can buy an SMS pack in “Plan”`,
      )
    }
    const link = `${this.config.get('PUBLIC_WEB_URL', { infer: true })}/${business.slug}/book`
    await this.query(
      `INSERT INTO "mailings" ("business_id", "segment", "lapsed_days", "text", "recipients")
       VALUES ($1, $2, $3, $4, $5)`,
      [business.id, segment, segment === 'lapsed' ? days : null, text, recipients.length],
    )
    for (const recipient of recipients) {
      await this.billing.takeSms(business.id, { isOptional: false })
      void this.sms.sendSafely(recipient.phone, renderMailing(text, recipient.name, link))
    }
    this.logger.log(`Mailing “${segment}” for ${business.slug}: ${recipients.length}`)

    return { recipients: recipients.length }
  }

  async history(businessId: string) {
    const rows = await this.query(
      `SELECT "id", "segment", "lapsed_days" AS "lapsedDays", "text", "recipients", "created_at" AS "createdAt"
       FROM "mailings" WHERE "business_id" = $1 ORDER BY "created_at" DESC LIMIT 20`,
      [businessId],
    )
    return rows.map((row) => ({
      id: String(row.id),
      segment: String(row.segment) as Segment,
      lapsedDays: row.lapsedDays === null ? null : Number(row.lapsedDays),
      text: String(row.text),
      recipients: Number(row.recipients),
      createdAt: (row.createdAt as Date).toISOString(),
    }))
  }

  async getBirthdayGreeting(businessId: string) {
    const [row] = await this.query('SELECT "birthday_greeting" FROM "businesses" WHERE "id" = $1', [
      businessId,
    ])
    return { text: (row?.birthday_greeting as string | null) ?? null }
  }

  async setBirthdayGreeting(businessId: string, text: string | null) {
    await this.query('UPDATE "businesses" SET "birthday_greeting" = $2 WHERE "id" = $1', [
      businessId,
      text,
    ])
    return { text }
  }

  /** Daily at 11:00 business time: each client with a birthday today gets the greeting once. */
  @Cron('0 5 * * *')
  async greetBirthdays() {
    const today = toBusinessParts(new Date()).dateKey
    const year = Number(today.slice(0, 4))
    const businesses = await this.query(
      `SELECT "id", "slug", "birthday_greeting" FROM "businesses"
       WHERE "birthday_greeting" IS NOT NULL AND "is_published"`,
      [],
    )
    const web = this.config.get('PUBLIC_WEB_URL', { infer: true })
    for (const business of businesses) {
      const recipients = (await this.recipients(String(business.id), 'birthday', 0)).filter(
        (recipient) => recipient.birthday && daysUntilBirthday(recipient.birthday, today) === 0,
      )
      for (const recipient of recipients) {
        const [claimed] = await this.query(
          `INSERT INTO "birthday_greetings" ("business_id", "phone", "year") VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING RETURNING "phone"`,
          [business.id, recipient.phone, year],
        )
        if (!claimed) continue
        const hasSms = await this.billing.takeSms(String(business.id), { isOptional: true })
        if (!hasSms) continue
        void this.sms.sendSafely(
          recipient.phone,
          renderMailing(
            String(business.birthday_greeting),
            recipient.name,
            `${web}/${business.slug}/book`,
          ),
        )
      }
    }
  }

  private async recipients(businessId: string, segment: Segment, days: number) {
    const rows = await this.query(
      `WITH clients AS (
         SELECT b."customer_phone" AS "phone",
           (array_agg(b."customer_name" ORDER BY b."starts_at" DESC))[1] AS "name",
           (array_agg(b."sms_confirmation" ORDER BY b."created_at" DESC))[1] AS "consent",
           MAX(b."starts_at") FILTER (WHERE b."starts_at" < now()) AS "lastVisit",
           bool_or(b."starts_at" > now()) AS "hasFuture"
         FROM "bookings" b
         WHERE b."business_id" = $1 AND b."status" = 'confirmed'
         GROUP BY b."customer_phone"
       )
       SELECT c."phone", c."name", c."lastVisit", c."hasFuture",
         to_char(r."birthday", 'YYYY-MM-DD') AS "birthday"
       FROM clients c
       LEFT JOIN "client_records" r ON r."business_id" = $1 AND r."phone" = c."phone"
       WHERE c."consent"`,
      [businessId],
    )
    const today = toBusinessParts(new Date()).dateKey
    const cutoff = Date.now() - days * 86_400_000

    return rows
      .filter((row) => {
        if (segment === 'all') return true
        if (segment === 'lapsed') {
          const last = row.lastVisit ? new Date(row.lastVisit as string).getTime() : null
          return last !== null && last < cutoff && !row.hasFuture
        }
        return (
          typeof row.birthday === 'string' &&
          daysUntilBirthday(row.birthday, today) <= BIRTHDAY_WINDOW_DAYS
        )
      })
      .map(
        (row): Recipient => ({
          phone: String(row.phone),
          name: String(row.name ?? ''),
          birthday: (row.birthday as string | null) ?? null,
        }),
      )
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Record<string, unknown>[]>
  }
}

export { daysUntilBirthday }
