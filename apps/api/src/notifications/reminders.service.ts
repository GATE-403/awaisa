import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { visitNames } from '../bookings/visit-sql.js'
import { formatMinutes, toBusinessParts } from '../common/business-time.js'
import { returnedRows } from '../common/sql.js'
import { visitLink } from '../common/visit-link.js'
import type { Env } from '../config/env.js'
import { ClientMessagesService } from './client-messages.service.js'
import { reminderMessage } from './messages.js'
import { whatsappReminder } from './whatsapp-messages.js'

type DueReminder = {
  id: string
  customer_phone: string
  starts_at: Date
  service_name: string
  specialist_name: string
  business_name: string
  business_slug: string
  business_id: string
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly messages: ClientMessagesService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendDueReminders() {
    // Claiming rows with UPDATE … RETURNING keeps several API instances from texting twice.
    const result: unknown = await this.dataSource.query(
      `
      UPDATE "bookings" AS b SET "reminder_sent_at" = now()
      FROM "services" AS s, "specialists" AS sp, "businesses" AS bz
      WHERE s."id" = b."service_id" AND sp."id" = b."specialist_id" AND bz."id" = b."business_id"
        AND b."status" = 'confirmed' AND b."reminder_sent_at" IS NULL
        AND b."reminder_minutes" IS NOT NULL
        AND b."payment_status" IS DISTINCT FROM 'pending'
        AND b."starts_at" > now() AND b."starts_at" <= now() + make_interval(mins => b."reminder_minutes")
      RETURNING b."id", b."customer_phone", b."starts_at", ${visitNames()} AS service_name, sp."name" AS specialist_name,
        bz."name" AS business_name, bz."slug" AS business_slug, b."business_id"
      `,
    )
    const due = returnedRows<DueReminder>(result)
    if (due.length === 0) return

    this.logger.log(`Sending ${due.length} reminder(s)`)
    await Promise.all(
      due.map((row) => {
        const { dateKey, minutes } = toBusinessParts(new Date(row.starts_at))
        const isToday = dateKey === toBusinessParts(new Date()).dateKey
        const link = visitLink(
          this.config.get('PUBLIC_WEB_URL', { infer: true }),
          row.id,
          this.config.get('AUTH_SECRET', { infer: true }),
        )
        const booking = {
          business: { name: row.business_name, slug: row.business_slug },
          serviceName: row.service_name,
          specialistName: row.specialist_name,
          date: dateKey,
          time: formatMinutes(minutes),
        }

        // Telegram when the client linked it (a «Перенести или отменить» button), then WhatsApp, else SMS.
        return this.messages.send(row.customer_phone, {
          text: reminderMessage(booking, isToday, link),
          link: { label: 'Перенести или отменить', url: link },
          whatsapp: whatsappReminder(booking, isToday, link),
          billing: { businessId: row.business_id, isOptional: true },
        })
      }),
    )
  }
}
