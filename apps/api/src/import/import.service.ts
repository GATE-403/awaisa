import { createHash, randomBytes } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { businessDateTimeToUtc } from '../common/business-time.js'
import { normalizePhone } from '../common/phone.js'
import type { ImportBookingsInput, ImportClientsInput } from './import.schemas.js'
import { matchByName, parseDate, parseTime } from './import-rows.js'

type Row = Record<string, unknown>
type Skipped = { row: number; reason: string }

/** How many skipped rows the report lists; the rest are only counted. */
const REPORT_LIMIT = 50

const report = (imported: number, skipped: Skipped[]) => ({
  imported,
  skippedCount: skipped.length,
  skipped: skipped.slice(0, REPORT_LIMIT),
})

/**
 * Moving from Altegio or YCLIENTS: the client base (name, phone, birthday, note) and the
 * bookings still ahead. The other system already placed those visits, so they go in as they are
 * — no slot step, hours or lead time — and only a master's overlapping visit refuses one. Nobody
 * gets a confirmation SMS; reminders go out as usual when the owner keeps them on.
 */
@Injectable()
export class ImportService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async importClients(businessId: string, input: ImportClientsInput) {
    const skipped: Skipped[] = []
    let imported = 0
    for (const [index, client] of input.clients.entries()) {
      const row = index + 1
      const phone = normalizePhone(client.phone)
      if (!phone) {
        skipped.push({ row, reason: client.phone ? 'неверный телефон' : 'нет телефона' })
        continue
      }
      const birthday = client.birthday ? parseDate(client.birthday) : null
      // Notes and birthdays someone already wrote here are kept.
      await this.query(
        `INSERT INTO "client_records" ("business_id", "phone", "name", "note", "birthday")
         VALUES ($1, $2, NULLIF($3, ''), $4, $5)
         ON CONFLICT ("business_id", "phone") DO UPDATE SET
           "name" = COALESCE(EXCLUDED."name", "client_records"."name"),
           "note" = CASE WHEN "client_records"."note" = '' THEN EXCLUDED."note" ELSE "client_records"."note" END,
           "birthday" = COALESCE("client_records"."birthday", EXCLUDED."birthday")`,
        [businessId, phone, client.name.slice(0, 120), client.note, birthday],
      )
      imported += 1
    }
    return report(imported, skipped)
  }

  async importBookings(businessId: string, input: ImportBookingsInput) {
    const [services, masters, [defaultBranch]] = await Promise.all([
      this.query(
        `SELECT "id", "name", "duration_minutes" AS "duration" FROM "services"
         WHERE "business_id" = $1 ORDER BY "is_active" DESC`,
        [businessId],
      ),
      this.query(
        `SELECT "id", "name", "branch_id" AS "branchId" FROM "specialists"
         WHERE "business_id" = $1 ORDER BY "is_active" DESC`,
        [businessId],
      ),
      this.query(
        'SELECT "id" FROM "branches" WHERE "business_id" = $1 AND "is_active" ORDER BY "position" LIMIT 1',
        [businessId],
      ),
    ])
    const named = <T extends Row>(rows: T[]) =>
      rows.map((row) => ({ ...row, name: String(row.name) }))
    const knownServices = named(services)
    const knownMasters = named(masters)
    const now = Date.now()
    const skipped: Skipped[] = []
    let imported = 0

    for (const [index, booking] of input.bookings.entries()) {
      const row = index + 1
      const date = parseDate(booking.date)
      const time = parseTime(booking.time) ?? parseTime(booking.date)
      const phone = normalizePhone(booking.phone)
      const service = matchByName(knownServices, booking.service)
      const master = matchByName(knownMasters, booking.master)
      const reason = !date
        ? 'не прочитана дата'
        : !time
          ? 'не прочитано время'
          : !phone
            ? 'нет телефона'
            : !service
              ? `нет услуги «${booking.service || '—'}»`
              : !master
                ? `нет мастера «${booking.master || '—'}»`
                : null
      if (reason || !date || !time || !phone || !service || !master) {
        skipped.push({ row, reason: reason ?? 'не прочитана строка' })
        continue
      }
      const [hours, minutes] = time.split(':').map(Number)
      const startsAt = businessDateTimeToUtc(date, hours * 60 + minutes)
      if (startsAt.getTime() <= now) {
        skipped.push({ row, reason: 'визит уже прошёл' })
        continue
      }
      const endsAt = new Date(startsAt.getTime() + Number(service.duration) * 60_000)
      try {
        const created = await this.query(
          `INSERT INTO "bookings" ("business_id", "service_id", "specialist_id", "starts_at", "ends_at",
             "customer_name", "customer_phone", "comment", "status", "cancel_token_hash", "branch_id",
             "sms_confirmation", "reminder_minutes", "source")
           SELECT $1::uuid, $2::varchar, $3::varchar, $4::timestamptz, $5::timestamptz, $6::varchar, $7::varchar,
             $8::text, 'confirmed', $9::varchar, $10::uuid, $11::boolean, $12::int, 'import'
           WHERE NOT EXISTS (SELECT 1 FROM "bookings" WHERE "business_id" = $1
             AND "customer_phone" = $7::varchar AND "starts_at" = $4::timestamptz AND "status" = 'confirmed')
           RETURNING "id"`,
          [
            businessId,
            service.id,
            master.id,
            startsAt,
            endsAt,
            (booking.name || 'Клиент').slice(0, 120),
            phone,
            booking.comment.slice(0, 500),
            createHash('sha256').update(randomBytes(24)).digest('hex'),
            master.branchId ?? defaultBranch?.id ?? null,
            // The client keeps getting texts about this visit, unless the owner turned reminders off.
            input.remind,
            input.remind ? 120 : null,
          ],
        )
        if (created.length === 0) {
          skipped.push({ row, reason: 'уже импортирована' })
          continue
        }
        imported += 1
      } catch (error) {
        if ((error as { code?: string }).code !== '23P01') throw error
        skipped.push({
          row,
          reason: `у мастера уже есть запись ${date.split('-').reverse().join('.')} в ${time}`,
        })
      }
    }
    return report(imported, skipped)
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
