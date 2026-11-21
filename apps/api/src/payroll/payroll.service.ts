import type {
  MasterDayPay,
  MasterPay,
  MasterPayout,
  MasterPayScheme,
  PayRateKind,
  SalaryKind,
} from '@awaisa/contracts'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { lineShare, visitLines, visitPrice } from '../bookings/visit-sql.js'
import { addDays, businessDateTimeToUtc, toBusinessParts } from '../common/business-time.js'
import { calculatePay, countWorkDays, daysBetween, hasScheme, type PayVisit } from './payroll.js'
import type { PayoutInput, PaySchemeInput } from './payroll.schemas.js'

type SchemeRow = {
  id: string
  percent: number | null
  salaryKind: SalaryKind | null
  salaryAmount: number | null
  minimum: number | null
  productsPercent: number | null
  hasOwnHours: boolean
}

// What analytics counts as a visit and what it earned: not a no-show, the money paid (so
// discounts, certificates, subscriptions and bonuses lower it) or the price minus the discount
// when nobody marked the payment. Keep it equal to `DONE` / `EARNED` in analytics.service.ts.
const DONE = `b."status" = 'confirmed' AND b."outcome" IS DISTINCT FROM 'no_show'`
const EARNED = `COALESCE(b."paid_amount", ${visitPrice()} - COALESCE(b."discount_amount", 0))`

const toPayout = (row: Record<string, unknown>): MasterPayout => ({
  id: String(row.id),
  specialistId: String(row.specialistId),
  amount: Number(row.amount),
  from: String(row.from),
  to: String(row.to),
  paidOn: String(row.paidOn),
  note: String(row.note ?? ''),
})

// Master pay: schemes, the pay of a period by them, and the payouts the owner marks.
@Injectable()
export class PayrollService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getScheme(businessId: string, specialistId: string): Promise<MasterPayScheme> {
    const [row] = await this.schemeRows(businessId, [specialistId])
    if (!row) throw new NotFoundException('Мастер не найден')
    const rates = await this.rateRows([specialistId])
    return this.toScheme(row, rates)
  }

  async setScheme(
    businessId: string,
    specialistId: string,
    input: PaySchemeInput,
  ): Promise<MasterPayScheme> {
    await this.dataSource.transaction(async (manager) => {
      const [master] = await manager.query(
        'SELECT 1 FROM "specialists" WHERE "id" = $1 AND "business_id" = $2 FOR UPDATE',
        [specialistId, businessId],
      )
      if (!master) throw new NotFoundException('Мастер не найден')
      await this.checkServices(manager, businessId, input)
      await manager.query(
        `UPDATE "specialists" SET "commission_percent" = $2, "salary_kind" = $3,
           "salary_amount" = $4, "pay_minimum" = $5, "products_percent" = $6 WHERE "id" = $1`,
        [
          specialistId,
          input.percent,
          input.salary?.kind ?? null,
          input.salary?.amount ?? null,
          input.minimum,
          input.productsPercent,
        ],
      )
      await manager.query('DELETE FROM "master_service_rates" WHERE "specialist_id" = $1', [
        specialistId,
      ])
      for (const rate of input.rates) {
        await manager.query(
          `INSERT INTO "master_service_rates" ("specialist_id", "service_id", "kind", "value")
             VALUES ($1, $2, $3, $4)`,
          [specialistId, rate.serviceId, rate.kind, rate.value],
        )
      }
    })
    return this.getScheme(businessId, specialistId)
  }

  /**
   * Each active master's pay for `from`..`to` (business days, both included), with the payouts
   * of periods that touch it. Masters without a scheme are left out.
   */
  async forPeriod(
    businessId: string,
    from: string,
    to: string,
    specialistIds?: string[],
  ): Promise<Map<string, MasterPay>> {
    const schemes = await this.schemeRows(businessId, specialistIds)
    const ids = schemes.map((row) => row.id)
    const result = new Map<string, MasterPay>()
    if (ids.length === 0) return result
    const days = daysBetween(from, to)
    const [rates, visits, sold, businessWeekdays, ownHours, leaves, payouts] = await Promise.all([
      this.rateRows(ids),
      this.query(
        // A visit of several services is a line per service, sharing the visit's money by price.
        `SELECT b."specialist_id" AS "specialistId", ls."id" AS "serviceId",
             ls."name" AS "serviceName", (${EARNED} * ${lineShare()})::float AS "earned"
           FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           JOIN LATERAL ${visitLines()} l ON true
           JOIN "services" ls ON ls."id" = l."service_id"
           WHERE b."business_id" = $1 AND b."specialist_id" = ANY($2) AND ${DONE}
             AND b."starts_at" >= $3 AND b."starts_at" < LEAST($4, now())`,
        [businessId, ids, businessDateTimeToUtc(from, 0), businessDateTimeToUtc(addDays(to, 1), 0)],
      ),
      // Products the master sold at the counter; an undone sale is not theirs to earn on.
      this.query(
        `SELECT x."seller_specialist_id" AS "specialistId", SUM(x."total") AS "total"
           FROM "sales" x
           WHERE x."business_id" = $1 AND x."seller_specialist_id" = ANY($2)
             AND x."cancelled_at" IS NULL AND x."created_at" >= $3 AND x."created_at" < $4
           GROUP BY 1`,
        [businessId, ids, businessDateTimeToUtc(from, 0), businessDateTimeToUtc(addDays(to, 1), 0)],
      ),
      this.query('SELECT "weekday" FROM "working_hours" WHERE "business_id" = $1', [businessId]),
      this.query(
        'SELECT "specialist_id" AS "id", "weekday" FROM "specialist_hours" WHERE "specialist_id" = ANY($1)',
        [ids],
      ),
      this.query(
        `SELECT "specialist_id" AS "id", "starts_on"::text AS "startsOn", "ends_on"::text AS "endsOn"
           FROM "specialist_leaves" WHERE "specialist_id" = ANY($1)
             AND "starts_on" <= $3 AND "ends_on" >= $2`,
        [ids, from, to],
      ),
      this.payouts(businessId, from, to, ids),
    ])
    const business = new Set(businessWeekdays.map((row) => Number(row.weekday)))
    // Days already lived: a daily salary is not owed for days still ahead.
    const today = toBusinessParts(new Date()).dateKey
    const lived = days.filter((day) => day <= today)

    for (const row of schemes) {
      const scheme = this.toScheme(row, rates)
      if (!hasScheme(scheme)) continue
      const workDays = countWorkDays(lived, {
        businessWeekdays: business,
        ownWeekdays: row.hasOwnHours
          ? new Set(
              ownHours.filter((hour) => hour.id === row.id).map((hour) => Number(hour.weekday)),
            )
          : null,
        leaves: leaves
          .filter((leave) => leave.id === row.id)
          .map((leave) => ({ startsOn: String(leave.startsOn), endsOn: String(leave.endsOn) })),
      })
      const pay = calculatePay({
        scheme,
        visits: visits
          .filter((visit) => visit.specialistId === row.id)
          .map(
            (visit): PayVisit => ({
              serviceId: String(visit.serviceId),
              serviceName: String(visit.serviceName),
              earned: Number(visit.earned),
            }),
          ),
        productsSold: Number(sold.find((item) => item.specialistId === row.id)?.total ?? 0),
        days: lived,
        workDays,
      })
      const own = payouts.filter((payout) => payout.specialistId === row.id)
      const paid = own.reduce((sum, payout) => sum + payout.amount, 0)
      result.set(row.id, {
        ...pay,
        salaryKind: scheme.salary?.kind ?? null,
        paid,
        due: Math.max(pay.total - paid, 0),
        payouts: own,
      })
    }
    return result
  }

  /** «Мой день»: the day's own work, and the month of that day so far. */
  async forMasterDay(
    businessId: string,
    specialistId: string,
    date: string,
  ): Promise<MasterDayPay | null> {
    const today = toBusinessParts(new Date()).dateKey
    const monthFrom = `${date.slice(0, 8)}01`
    const [year = 2000, month = 1] = date.split('-').map(Number)
    const monthEnd = `${date.slice(0, 8)}${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`
    const monthTo = monthEnd < today ? monthEnd : today
    const [day, period, scheme] = await Promise.all([
      this.forPeriod(businessId, date, date, [specialistId]),
      monthFrom <= monthTo
        ? this.forPeriod(businessId, monthFrom, monthTo, [specialistId])
        : Promise.resolve(new Map<string, MasterPay>()),
      this.getScheme(businessId, specialistId),
    ])
    const dayPay = day.get(specialistId)
    if (!dayPay) return null
    return {
      // A monthly salary and the minimum belong to the month, not to one day.
      day: dayPay.services + dayPay.products + (dayPay.salaryKind === 'day' ? dayPay.salary : 0),
      month: period.get(specialistId)?.total ?? 0,
      monthFrom,
      monthTo,
      percent:
        scheme.rates.length === 0 &&
        scheme.salary === null &&
        scheme.minimum === null &&
        scheme.productsPercent === null
          ? scheme.percent
          : null,
    }
  }

  async addPayout(businessId: string, input: PayoutInput): Promise<MasterPayout> {
    const [master] = await this.query(
      'SELECT 1 FROM "specialists" WHERE "id" = $1 AND "business_id" = $2',
      [input.specialistId, businessId],
    )
    if (!master) throw new NotFoundException('Мастер не найден')
    const [row] = await this.query(
      `INSERT INTO "master_payouts"
           ("business_id", "specialist_id", "period_from", "period_to", "amount", "paid_on", "note")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING "id", "specialist_id" AS "specialistId", "amount", "period_from"::text AS "from",
           "period_to"::text AS "to", "paid_on"::text AS "paidOn", "note"`,
      [
        businessId,
        input.specialistId,
        input.from,
        input.to,
        input.amount,
        input.paidOn,
        input.note,
      ],
    )
    return toPayout(row ?? {})
  }

  async removePayout(businessId: string, id: string) {
    const [, count] = (await this.dataSource.query(
      'DELETE FROM "master_payouts" WHERE "id" = $1 AND "business_id" = $2',
      [id, businessId],
    )) as [unknown, number]
    if (count === 0) throw new NotFoundException('Выплата не найдена')
  }

  private async payouts(businessId: string, from: string, to: string, ids: string[]) {
    const rows = await this.query(
      `SELECT "id", "specialist_id" AS "specialistId", "amount", "period_from"::text AS "from",
           "period_to"::text AS "to", "paid_on"::text AS "paidOn", "note"
         FROM "master_payouts"
         WHERE "business_id" = $1 AND "specialist_id" = ANY($2)
           AND "period_from" <= $4 AND "period_to" >= $3
         ORDER BY "paid_on" DESC, "created_at" DESC`,
      [businessId, ids, from, to],
    )
    return rows.map(toPayout)
  }

  private async checkServices(manager: EntityManager, businessId: string, input: PaySchemeInput) {
    if (input.rates.length === 0) return
    const ids = input.rates.map((rate) => rate.serviceId)
    const rows = (await manager.query(
      'SELECT "id" FROM "services" WHERE "business_id" = $1 AND "id" = ANY($2)',
      [businessId, ids],
    )) as unknown[]
    if (rows.length !== ids.length) throw new BadRequestException('Услуга не найдена')
  }

  private async schemeRows(businessId: string, ids?: string[]): Promise<SchemeRow[]> {
    const rows = await this.query(
      `SELECT "id", "commission_percent" AS "percent", "salary_kind" AS "salaryKind",
           "salary_amount" AS "salaryAmount", "pay_minimum" AS "minimum",
           "products_percent" AS "productsPercent", "has_own_hours" AS "hasOwnHours"
         FROM "specialists"
         WHERE "business_id" = $1 AND ${ids ? '"id" = ANY($2)' : '"is_active"'}`,
      ids ? [businessId, ids] : [businessId],
    )
    return rows.map((row) => ({
      id: String(row.id),
      percent: row.percent === null ? null : Number(row.percent),
      salaryKind: (row.salaryKind as SalaryKind | null) ?? null,
      salaryAmount: row.salaryAmount === null ? null : Number(row.salaryAmount),
      minimum: row.minimum === null ? null : Number(row.minimum),
      productsPercent: row.productsPercent === null ? null : Number(row.productsPercent),
      hasOwnHours: Boolean(row.hasOwnHours),
    }))
  }

  private async rateRows(ids: string[]) {
    const rows = await this.query(
      `SELECT r."specialist_id" AS "specialistId", r."service_id" AS "serviceId", r."kind", r."value"
         FROM "master_service_rates" r WHERE r."specialist_id" = ANY($1)
         ORDER BY r."service_id"`,
      [ids],
    )
    return rows.map((row) => ({
      specialistId: String(row.specialistId),
      serviceId: String(row.serviceId),
      kind: row.kind as PayRateKind,
      value: Number(row.value),
    }))
  }

  private toScheme(
    row: SchemeRow,
    rates: { specialistId: string; serviceId: string; kind: PayRateKind; value: number }[],
  ): MasterPayScheme {
    return {
      percent: row.percent,
      rates: rates
        .filter((rate) => rate.specialistId === row.id)
        .map(({ serviceId, kind, value }) => ({ serviceId, kind, value })),
      salary:
        row.salaryKind && row.salaryAmount !== null
          ? { kind: row.salaryKind, amount: row.salaryAmount }
          : null,
      minimum: row.minimum,
      productsPercent: row.productsPercent,
    }
  }

  private query(sql: string, parameters: unknown[]) {
    return this.dataSource.query(sql, parameters) as Promise<Record<string, unknown>[]>
  }
}
