import { randomInt } from 'node:crypto'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { toBusinessParts } from '../common/business-time.js'
import { normalizePhone } from '../common/phone.js'
import type { CertificateInput, PlanInput } from './loyalty.schemas.js'
import { type SettledVisit, subscriptionCovers } from './visit-cover.js'

type Row = Record<string, unknown>

/** What a visit's payment may draw on besides money. */
type VisitExtras = {
  subscriptionId?: string | null
  certificateCode?: string | null
  certificateAmount?: number | null
  bonusAmount?: number | null
}

type VisitToSettle = SettledVisit & {
  id: string
  businessId: string
  phone: string
  serviceId: string
}

// Codes people read aloud at the desk: no 0/O, 1/I/L.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

const toNumber = (value: unknown) => Number(value ?? 0)

const today = () => toBusinessParts(new Date()).dateKey

const plusDays = (days: number) => {
  const date = new Date(`${today()}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Loyalty for a business: bonuses earned on paid visits, gift certificates with a balance and
 * subscriptions with visits left. Everything is spent through a visit's outcome, so the visit
 * keeps the record and an «undo» (outcome back to pending / no-show) gives it all back.
 */
@Injectable()
export class LoyaltyService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ---------- Settings and plans ----------

  async getSettings(businessId: string) {
    const [row] = await this.query('SELECT "bonus_percent" FROM "businesses" WHERE "id" = $1', [
      businessId,
    ])
    return { bonusPercent: row?.bonus_percent === null ? null : toNumber(row?.bonus_percent) }
  }

  async setBonusPercent(businessId: string, percent: number | null) {
    await this.query('UPDATE "businesses" SET "bonus_percent" = $2 WHERE "id" = $1', [
      businessId,
      percent,
    ])
    return this.getSettings(businessId)
  }

  async listPlans(businessId: string) {
    const rows = await this.query(
      `SELECT p."id", p."title", p."service_id" AS "serviceId", s."name" AS "serviceName",
         p."visits", p."price", p."valid_days" AS "validDays", p."is_active" AS "isActive", p."is_online" AS "isOnline"
       FROM "subscription_plans" p LEFT JOIN "services" s ON s."id" = p."service_id"
       WHERE p."business_id" = $1 ORDER BY p."created_at" DESC`,
      [businessId],
    )
    return rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      serviceId: row.serviceId === null ? null : String(row.serviceId),
      serviceName: row.serviceName === null ? null : String(row.serviceName),
      visits: toNumber(row.visits),
      price: toNumber(row.price),
      validDays: toNumber(row.validDays),
      isActive: Boolean(row.isActive),
      isOnline: Boolean(row.isOnline),
    }))
  }

  async savePlan(businessId: string, input: PlanInput, id?: string) {
    if (input.serviceId) await this.ownService(businessId, input.serviceId)
    const values = [
      input.title,
      input.serviceId,
      input.visits,
      input.price,
      input.validDays,
      input.isActive,
      // A free plan has nothing to pay online.
      input.isOnline && input.price > 0,
    ]
    if (id) {
      const updated = await this.query(
        `UPDATE "subscription_plans" SET "title" = $3, "service_id" = $4, "visits" = $5, "price" = $6,
           "valid_days" = $7, "is_active" = $8, "is_online" = $9
         WHERE "id" = $1 AND "business_id" = $2 RETURNING "id"`,
        [id, businessId, ...values],
      )
      if (updated.length === 0) throw new NotFoundException('Абонемент не найден')
    } else {
      await this.query(
        `INSERT INTO "subscription_plans" ("business_id", "title", "service_id", "visits", "price",
           "valid_days", "is_active", "is_online") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [businessId, ...values],
      )
    }
    return this.listPlans(businessId)
  }

  async deletePlan(businessId: string, id: string) {
    await this.query('DELETE FROM "subscription_plans" WHERE "id" = $1 AND "business_id" = $2', [
      id,
      businessId,
    ])
  }

  // ---------- Certificates ----------

  async listCertificates(businessId: string) {
    const rows = await this.query(
      `SELECT "id", "code", "amount", "balance", "recipient", "phone", to_char("expires_on", 'YYYY-MM-DD') AS "expiresOn",
         "created_at" AS "createdAt"
       FROM "gift_certificates" WHERE "business_id" = $1 ORDER BY "created_at" DESC LIMIT 200`,
      [businessId],
    )
    return rows.map(this.toCertificate)
  }

  async issueCertificate(businessId: string, input: CertificateInput) {
    const phone = input.phone ? normalizePhone(input.phone) : null
    if (input.phone && !phone) throw new BadRequestException('Проверьте номер телефона')
    // Codes are random; a clash with an existing one (unique per business) is simply retried.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = Array.from(
        { length: CODE_LENGTH },
        () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
      ).join('')
      const rows = await this.query(
        `INSERT INTO "gift_certificates" ("business_id", "code", "amount", "balance", "recipient", "phone", "expires_on")
         VALUES ($1, $2, $3, $3, $4, $5, $6)
         ON CONFLICT ("business_id", "code") DO NOTHING
         RETURNING "id", "code", "amount", "balance", "recipient", "phone", to_char("expires_on", 'YYYY-MM-DD') AS "expiresOn", "created_at" AS "createdAt"`,
        [businessId, code, input.amount, input.recipient, phone, input.expiresOn],
      )
      if (rows[0]) return this.toCertificate(rows[0])
    }
    throw new BadRequestException('Не получилось выпустить сертификат, попробуйте ещё раз')
  }

  async findCertificate(businessId: string, code: string) {
    const [row] = await this.query(
      `SELECT "id", "code", "amount", "balance", "recipient", "phone", to_char("expires_on", 'YYYY-MM-DD') AS "expiresOn",
         "created_at" AS "createdAt"
       FROM "gift_certificates" WHERE "business_id" = $1 AND "code" = $2`,
      [businessId, code.trim().toUpperCase()],
    )
    if (!row) throw new NotFoundException('Сертификат не найден')
    return this.toCertificate(row)
  }

  // ---------- A client ----------

  /** The client card: bonus balance, live subscriptions and the certificates on their number. */
  async forClient(businessId: string, rawPhone: string) {
    const phone = normalizePhone(rawPhone) ?? rawPhone
    const [balance] = await this.query(
      'SELECT COALESCE(SUM("amount"), 0)::int AS "balance" FROM "bonus_transactions" WHERE "business_id" = $1 AND "phone" = $2',
      [businessId, phone],
    )
    const subscriptions = await this.query(
      `SELECT cs."id", cs."title", cs."service_id" AS "serviceId", s."name" AS "serviceName",
         cs."visits_total" AS "visitsTotal", cs."visits_left" AS "visitsLeft",
         to_char(cs."expires_on", 'YYYY-MM-DD') AS "expiresOn"
       FROM "client_subscriptions" cs LEFT JOIN "services" s ON s."id" = cs."service_id"
       WHERE cs."business_id" = $1 AND cs."phone" = $2 AND cs."visits_left" > 0 AND cs."expires_on" >= $3
       ORDER BY cs."expires_on"`,
      [businessId, phone, today()],
    )
    const certificates = await this.query(
      `SELECT "id", "code", "amount", "balance", "recipient", "phone", to_char("expires_on", 'YYYY-MM-DD') AS "expiresOn",
         "created_at" AS "createdAt"
       FROM "gift_certificates"
       WHERE "business_id" = $1 AND "phone" = $2 AND "balance" > 0
         AND ("expires_on" IS NULL OR "expires_on" >= $3)`,
      [businessId, phone, today()],
    )
    const settings = await this.getSettings(businessId)

    return {
      bonusPercent: settings.bonusPercent,
      bonusBalance: toNumber(balance?.balance),
      subscriptions: subscriptions.map(this.toSubscription),
      certificates: certificates.map(this.toCertificate),
    }
  }

  async sellSubscription(businessId: string, rawPhone: string, planId: string) {
    const phone = normalizePhone(rawPhone)
    if (!phone) throw new BadRequestException('Проверьте номер телефона')
    const [plan] = await this.query(
      'SELECT * FROM "subscription_plans" WHERE "id" = $1 AND "business_id" = $2 AND "is_active"',
      [planId, businessId],
    )
    if (!plan) throw new NotFoundException('Абонемент не найден')
    await this.query(
      `INSERT INTO "client_subscriptions" ("business_id", "plan_id", "phone", "title", "service_id",
         "visits_total", "visits_left", "price_paid", "expires_on")
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)`,
      [
        businessId,
        planId,
        phone,
        plan.title,
        plan.service_id,
        plan.visits,
        plan.price,
        plusDays(toNumber(plan.valid_days)),
      ],
    )
    return this.forClient(businessId, phone)
  }

  /** A signed-in client's bonuses and subscriptions at every place. */
  async forCustomer(phone: string) {
    const rows = await this.query(
      `SELECT bz."slug", bz."name",
         COALESCE((SELECT SUM(t."amount") FROM "bonus_transactions" t
           WHERE t."business_id" = bz."id" AND t."phone" = $1), 0)::int AS "bonusBalance",
         (SELECT COALESCE(json_agg(json_build_object('title', cs."title", 'visitsLeft', cs."visits_left",
             'visitsTotal', cs."visits_total", 'expiresOn', cs."expires_on") ORDER BY cs."expires_on"), '[]')
           FROM "client_subscriptions" cs
           WHERE cs."business_id" = bz."id" AND cs."phone" = $1 AND cs."visits_left" > 0
             AND cs."expires_on" >= $2) AS "subscriptions"
       FROM "businesses" bz
       WHERE EXISTS (SELECT 1 FROM "bonus_transactions" t WHERE t."business_id" = bz."id" AND t."phone" = $1)
          OR EXISTS (SELECT 1 FROM "client_subscriptions" cs WHERE cs."business_id" = bz."id" AND cs."phone" = $1)`,
      [phone, today()],
    )
    return rows
      .map((row) => ({
        slug: String(row.slug),
        name: String(row.name),
        bonusBalance: toNumber(row.bonusBalance),
        subscriptions: (row.subscriptions ?? []) as {
          title: string
          visitsLeft: number
          visitsTotal: number
          expiresOn: string
        }[],
      }))
      .filter((row) => row.bonusBalance > 0 || row.subscriptions.length > 0)
  }

  /** The live subscriptions of a number at one place (the booking form's «Оплатить абонементом»). */
  async subscriptionsAt(businessId: string, phone: string) {
    return (await this.forClient(businessId, phone)).subscriptions
  }

  // ---------- Visits ----------

  /**
   * Draws a visit's payment from a subscription (covers it whole), a certificate and bonuses,
   * in that order; returns how much of `due` they covered and what paid for it. Each source is
   * used at most once per visit, so saving the outcome again does not spend twice.
   */
  async applyToVisit(visit: VisitToSettle, extras: VisitExtras) {
    let covered = await this.alreadyCovered(visit)
    let method: 'subscription' | 'certificate' | null = null

    if (extras.subscriptionId) {
      const used = await this.query(
        `WITH sub AS (
           UPDATE "client_subscriptions" SET "visits_left" = "visits_left" - 1
           WHERE "id" = $1 AND "business_id" = $2 AND "phone" = $3 AND "visits_left" > 0
             AND "expires_on" >= $4 AND ("service_id" IS NULL OR "service_id" = ANY($5))
             AND NOT EXISTS (SELECT 1 FROM "subscription_uses" WHERE "booking_id" = $6)
           RETURNING "id")
         INSERT INTO "subscription_uses" ("subscription_id", "booking_id")
         SELECT "id", $6 FROM sub RETURNING "id"`,
        [
          extras.subscriptionId,
          visit.businessId,
          visit.phone,
          today(),
          visit.lines?.map((line) => line.serviceId) ?? [visit.serviceId],
          visit.id,
        ],
      )
      if (used.length === 0 && !(await this.hasSubscriptionUse(visit.id))) {
        throw new BadRequestException(
          'Абонемент не подходит: закончился, истёк или на другую услугу',
        )
      }
      // Used just now: add what it pays; used before, `covered` already counts it.
      if (used.length > 0) {
        const [plan] = await this.query(
          'SELECT "service_id" AS "serviceId" FROM "client_subscriptions" WHERE "id" = $1',
          [extras.subscriptionId],
        )
        covered += subscriptionCovers(visit, (plan?.serviceId as string | null) ?? null)
      }
      method = 'subscription'
    }

    if (extras.certificateCode && covered < visit.due) {
      const certificate = await this.findCertificate(visit.businessId, extras.certificateCode)
      // Already drawn on for this visit (the outcome saved again): `covered` counts it.
      if (await this.hasCertificateUse(certificate.id, visit.id)) {
        return this.applyBonuses(visit, extras, covered, method)
      }
      if (certificate.expiresOn && certificate.expiresOn < today()) {
        throw new BadRequestException('Срок сертификата истёк')
      }
      const wanted = Math.min(extras.certificateAmount ?? visit.due - covered, visit.due - covered)
      const amount = Math.min(wanted, certificate.balance)
      if (amount <= 0) throw new BadRequestException('На сертификате нет денег')
      const spent = await this.query(
        `WITH cert AS (
           UPDATE "gift_certificates" SET "balance" = "balance" - $2
           WHERE "id" = $1 AND "balance" >= $2 RETURNING "id")
         INSERT INTO "certificate_uses" ("certificate_id", "booking_id", "amount")
         SELECT "id", $3, $2 FROM cert RETURNING "id"`,
        [certificate.id, amount, visit.id],
      )
      if (spent.length === 0) throw new BadRequestException('На сертификате не хватает денег')
      covered += amount
      if (covered >= visit.due) method = method ?? 'certificate'
    }

    return this.applyBonuses(visit, extras, covered, method)
  }

  private async applyBonuses(
    visit: VisitToSettle,
    extras: VisitExtras,
    alreadyCovered: number,
    method: 'subscription' | 'certificate' | null,
  ) {
    let covered = alreadyCovered
    // Bonuses this visit already spent are in `covered`: saving the outcome again spends no more
    // (and must not ask the balance for them a second time).
    const isSpent = Boolean(extras.bonusAmount) && (await this.hasBonusSpend(visit.id))
    if (extras.bonusAmount && extras.bonusAmount > 0 && covered < visit.due && !isSpent) {
      const amount = Math.min(extras.bonusAmount, visit.due - covered)
      const [balance] = await this.query(
        'SELECT COALESCE(SUM("amount"), 0)::int AS "balance" FROM "bonus_transactions" WHERE "business_id" = $1 AND "phone" = $2',
        [visit.businessId, visit.phone],
      )
      if (toNumber(balance?.balance) < amount) throw new BadRequestException('Бонусов не хватает')
      const spent = await this.query(
        `INSERT INTO "bonus_transactions" ("business_id", "phone", "amount", "kind", "booking_id", "note")
         VALUES ($1, $2, $3, 'spend', $4, 'Оплата визита')
         ON CONFLICT ("booking_id", "kind") WHERE "booking_id" IS NOT NULL DO NOTHING
         RETURNING "id"`,
        [visit.businessId, visit.phone, -amount, visit.id],
      )
      if (spent.length > 0) covered += amount
    }

    return { covered: Math.min(covered, visit.due), method }
  }

  /**
   * «Все пришли»: visits booked to be paid by a subscription draw a visit from it and are paid
   * by it; one whose subscription ran out meanwhile stays paid in cash, as marked.
   */
  async usePlannedSubscriptions(bookingIds: string[]) {
    if (bookingIds.length === 0) return
    const planned = await this.query(
      `SELECT b."id", b."business_id" AS "businessId", b."customer_phone" AS "phone",
         b."service_id" AS "serviceId", b."subscription_id" AS "subscriptionId"
       FROM "bookings" b WHERE b."id" = ANY($1) AND b."subscription_id" IS NOT NULL`,
      [bookingIds],
    )
    for (const row of planned) {
      const visit = {
        id: String(row.id),
        businessId: String(row.businessId),
        phone: String(row.phone),
        serviceId: String(row.serviceId),
        due: 0,
      }
      const isDrawn = await this.applyToVisit(visit, { subscriptionId: String(row.subscriptionId) })
        .then(() => true)
        .catch((error: unknown) => {
          if (error instanceof BadRequestException) return false
          throw error
        })
      if (isDrawn) {
        await this.query(
          `UPDATE "bookings" SET "paid_amount" = 0, "payment_method" = 'subscription' WHERE "id" = $1`,
          [visit.id],
        )
      }
    }
  }

  /** The visit is no longer «arrived»: everything it drew on comes back, earned bonuses go. */
  async revertVisits(bookingIds: string[]) {
    if (bookingIds.length === 0) return
    await this.query(
      `UPDATE "client_subscriptions" cs SET "visits_left" = cs."visits_left" + 1
       FROM "subscription_uses" u WHERE u."subscription_id" = cs."id" AND u."booking_id" = ANY($1)`,
      [bookingIds],
    )
    await this.query('DELETE FROM "subscription_uses" WHERE "booking_id" = ANY($1)', [bookingIds])
    await this.query(
      `UPDATE "gift_certificates" c SET "balance" = c."balance" + u."amount"
       FROM (SELECT "certificate_id", SUM("amount")::int AS "amount" FROM "certificate_uses"
             WHERE "booking_id" = ANY($1) GROUP BY "certificate_id") u
       WHERE c."id" = u."certificate_id"`,
      [bookingIds],
    )
    await this.query('DELETE FROM "certificate_uses" WHERE "booking_id" = ANY($1)', [bookingIds])
    await this.query('DELETE FROM "bonus_transactions" WHERE "booking_id" = ANY($1)', [bookingIds])
  }

  /** Bonuses for arrived visits: a share of the money paid (not of bonuses or certificates). */
  async earnForVisits(bookingIds: string[]) {
    if (bookingIds.length === 0) return
    await this.query(
      `INSERT INTO "bonus_transactions" ("business_id", "phone", "amount", "kind", "booking_id", "note")
       SELECT b."business_id", b."customer_phone", ROUND(b."paid_amount" * bz."bonus_percent" / 100.0)::int,
         'earn', b."id", 'За визит'
       FROM "bookings" b JOIN "businesses" bz ON bz."id" = b."business_id"
       WHERE b."id" = ANY($1) AND b."outcome" = 'arrived' AND bz."bonus_percent" IS NOT NULL
         AND b."payment_method" IN ('cash', 'card', 'transfer')
         AND ROUND(b."paid_amount" * bz."bonus_percent" / 100.0) > 0
       ON CONFLICT ("booking_id", "kind") WHERE "booking_id" IS NOT NULL
       DO UPDATE SET "amount" = EXCLUDED."amount"`,
      [bookingIds],
    )
    // A visit corrected to «paid by subscription» earns nothing any more.
    await this.query(
      `DELETE FROM "bonus_transactions" t USING "bookings" b
       WHERE t."booking_id" = b."id" AND t."kind" = 'earn' AND b."id" = ANY($1)
         AND (b."payment_method" NOT IN ('cash', 'card', 'transfer') OR b."paid_amount" IS NULL OR b."paid_amount" = 0)`,
      [bookingIds],
    )
  }

  private async alreadyCovered(visit: VisitToSettle) {
    const bookingId = visit.id
    const [row] = await this.query(
      `SELECT
         (SELECT COUNT(*) FROM "subscription_uses" WHERE "booking_id" = $1)::int AS "subscriptions",
         (SELECT cs."service_id" FROM "subscription_uses" su
            JOIN "client_subscriptions" cs ON cs."id" = su."subscription_id"
            WHERE su."booking_id" = $1 LIMIT 1) AS "planServiceId",
         (SELECT COALESCE(SUM("amount"), 0) FROM "certificate_uses" WHERE "booking_id" = $1)::int AS "certificates",
         (SELECT COALESCE(-SUM("amount"), 0) FROM "bonus_transactions" WHERE "booking_id" = $1 AND "kind" = 'spend')::int AS "bonuses"`,
      [bookingId],
    )
    const subscription =
      toNumber(row?.subscriptions) > 0
        ? subscriptionCovers(visit, (row?.planServiceId as string | null) ?? null)
        : 0
    return subscription + toNumber(row?.certificates) + toNumber(row?.bonuses)
  }

  private async hasBonusSpend(bookingId: string) {
    const rows = await this.query(
      `SELECT 1 FROM "bonus_transactions" WHERE "booking_id" = $1 AND "kind" = 'spend'`,
      [bookingId],
    )
    return rows.length > 0
  }

  private async hasCertificateUse(certificateId: string, bookingId: string) {
    const rows = await this.query(
      'SELECT 1 FROM "certificate_uses" WHERE "certificate_id" = $1 AND "booking_id" = $2',
      [certificateId, bookingId],
    )
    return rows.length > 0
  }

  private async hasSubscriptionUse(bookingId: string) {
    const rows = await this.query('SELECT 1 FROM "subscription_uses" WHERE "booking_id" = $1', [
      bookingId,
    ])
    return rows.length > 0
  }

  private async ownService(businessId: string, serviceId: string) {
    const rows = await this.query(
      'SELECT 1 FROM "services" WHERE "id" = $1 AND "business_id" = $2',
      [serviceId, businessId],
    )
    if (rows.length === 0) throw new NotFoundException('Услуга не найдена')
  }

  private toCertificate = (row: Row) => ({
    id: String(row.id),
    code: String(row.code),
    amount: toNumber(row.amount),
    balance: toNumber(row.balance),
    recipient: String(row.recipient ?? ''),
    phone: row.phone === null || row.phone === undefined ? null : String(row.phone),
    expiresOn: row.expiresOn ? String(row.expiresOn) : null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ''),
  })

  private toSubscription = (row: Row) => ({
    id: String(row.id),
    title: String(row.title),
    serviceId: row.serviceId === null ? null : String(row.serviceId),
    serviceName: row.serviceName === null ? null : String(row.serviceName),
    visitsTotal: toNumber(row.visitsTotal),
    visitsLeft: toNumber(row.visitsLeft),
    expiresOn: String(row.expiresOn),
  })

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
