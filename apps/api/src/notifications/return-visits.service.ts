import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { toBusinessParts } from '../common/business-time.js'
import type { Env } from '../config/env.js'
import { returnVisitMessage } from './messages.js'
import { SmsService } from './sms.service.js'

type DueReturn = {
  customer_phone: string
  service_id: string
  specialist_id: string
  service_name: string
  specialist_name: string
  business_name: string
  business_slug: string
}

// Texted in the daytime only: a nudge to book is not worth waking anyone up.
const SEND_FROM_HOUR = 10
const SEND_UNTIL_HOUR = 20

// A visit becomes due this many days after the service's interval and stops being due a week
// later, so turning the reminder on does not text everyone from years of history at once.
const DUE_WINDOW_DAYS = 7

/**
 * «Пора прийти снова»: a service may set `rebook_days`; that many days after a visit (that was
 * not a no-show) the client gets one SMS with a link to the same master — unless they already
 * booked that service again, or turned SMS off when booking.
 */
@Injectable()
export class ReturnVisitsService {
  private readonly logger = new Logger(ReturnVisitsService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly sms: SmsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendDue() {
    const hour = Math.floor(toBusinessParts(new Date()).minutes / 60)
    if (hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) return

    // Claimed with UPDATE … RETURNING: several API instances never text twice.
    const result: unknown = await this.dataSource.query(
      `
      UPDATE "bookings" AS b SET "rebook_reminded_at" = now()
      FROM "services" AS s, "specialists" AS sp, "businesses" AS bz
      WHERE s."id" = b."service_id" AND sp."id" = b."specialist_id" AND bz."id" = b."business_id"
        AND s."rebook_days" IS NOT NULL
        AND b."status" = 'confirmed' AND b."outcome" IS DISTINCT FROM 'no_show'
        AND b."sms_confirmation" AND b."rebook_reminded_at" IS NULL
        AND b."ends_at" <= now() - make_interval(days => s."rebook_days")
        AND b."ends_at" > now() - make_interval(days => s."rebook_days" + $1)
        AND bz."is_published" AND sp."is_active" AND s."is_active"
        AND NOT EXISTS (
          SELECT 1 FROM "bookings" later
          WHERE later."business_id" = b."business_id"
            AND later."customer_phone" = b."customer_phone"
            AND later."service_id" = b."service_id"
            AND later."starts_at" > b."starts_at"
            AND later."status" = 'confirmed'
        )
      RETURNING b."customer_phone", b."service_id", b."specialist_id", s."name" AS service_name,
        sp."name" AS specialist_name, bz."name" AS business_name, bz."slug" AS business_slug
      `,
      [DUE_WINDOW_DAYS],
    )
    const due = (
      Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result
    ) as DueReturn[]
    if (due.length === 0) return

    // One SMS per client and service even if several old visits came due together.
    const seen = new Set<string>()
    const web = this.config.get('PUBLIC_WEB_URL', { infer: true })
    for (const row of due) {
      const key = `${row.customer_phone}|${row.business_slug}|${row.service_id}`
      if (seen.has(key)) continue
      seen.add(key)
      const params = new URLSearchParams({ service: row.service_id, specialist: row.specialist_id })
      void this.sms.sendSafely(
        row.customer_phone,
        returnVisitMessage(
          row.business_name,
          row.service_name,
          row.specialist_name,
          `${web}/${row.business_slug}/book?${params}`,
        ),
      )
    }
    this.logger.log(`Return-visit reminders: ${seen.size}`)
  }
}
