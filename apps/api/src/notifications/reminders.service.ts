import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { REMINDER_LEAD_MINUTES } from '../bookings/booking-rules.js'
import { formatMinutes, toBusinessParts } from '../common/business-time.js'
import { reminderMessage } from './messages.js'
import { SmsService } from './sms.service.js'

type DueReminder = {
  customer_phone: string
  starts_at: Date
  service_name: string
  specialist_name: string
  business_name: string
  business_slug: string
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly sms: SmsService,
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
        AND b."starts_at" > now() AND b."starts_at" <= now() + make_interval(mins => $1)
      RETURNING b."customer_phone", b."starts_at", s."name" AS service_name, sp."name" AS specialist_name,
        bz."name" AS business_name, bz."slug" AS business_slug
      `,
      [REMINDER_LEAD_MINUTES],
    )
    // TypeORM returns [rows, affected] for UPDATE … RETURNING on Postgres.
    const due = (
      Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result
    ) as DueReminder[]
    if (due.length === 0) return

    this.logger.log(`Sending ${due.length} reminder(s)`)
    await Promise.all(
      due.map((row) => {
        const { dateKey, minutes } = toBusinessParts(new Date(row.starts_at))
        const message = reminderMessage({
          business: { name: row.business_name, slug: row.business_slug },
          serviceName: row.service_name,
          specialistName: row.specialist_name,
          date: dateKey,
          time: formatMinutes(minutes),
        })

        return this.sms.sendSafely(row.customer_phone, message)
      }),
    )
  }
}
