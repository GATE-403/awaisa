import type { PaymentOrder } from '@awaisa/contracts'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ModuleRef } from '@nestjs/core'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { BillingService } from '../billing/billing.service.js'
import type { Env } from '../config/env.js'
import { BookingPaymentsService } from './booking-payments.service.js'
import { PAYMENT_HOLD_MINUTES } from './booking-rules.js'
import { paymentSignature } from './payment-signature.js'
import { PaymentsService } from './payments.service.js'
import {
  coversService,
  fullPrice,
  issuedSubscription,
  type OrderStatus,
  shouldIssue,
} from './subscription-orders.js'

/** The payments' `kind` of a subscription order. */
const KIND = 'subscription'

type Row = Record<string, unknown>

type Buyer = { customerId: string | null; phone: string }

type PlacedOrder = { id: string; amount: number; title: string; businessName: string }

const toNumber = (value: unknown) => Number(value ?? 0)

const visitsWord = (count: number) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} визит`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} визита`
  return `${count} визитов`
}

/**
 * Subscriptions bought online: an order keeps the plan's terms while the client pays, and only a
 * confirmed payment turns it into the client's subscription (`client_subscriptions`, dated by the
 * payment). Unpaid orders expire with the payment hold; one paid after that is still issued.
 * «Купить абонемент и записаться»: the order names the held booking, confirmed once it is issued.
 */
@Injectable()
export class SubscriptionOrdersService implements OnModuleInit {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly payments: PaymentsService,
    private readonly config: ConfigService<Env, true>,
    // Resolved when a payment comes: BookingPaymentsService needs BookingsService, which needs this.
    private readonly moduleRef: ModuleRef,
    private readonly billing: BillingService,
  ) {}

  /**
   * Selling subscriptions online is part of the «loyalty» plan feature: without it the page shows
   * none and nothing can be bought. Subscriptions already bought are drawn at visits regardless.
   */
  private isSaleOpen(businessId: string) {
    return this.billing.hasFeature(businessId, 'loyalty')
  }

  onModuleInit() {
    this.payments.registerOrder(KIND, {
      describe: (orderId) => this.describe(orderId),
      onPaid: async (orderId) => {
        await this.onPaid(orderId)
      },
    })
  }

  /** The place's plans sold online, with what the visits would cost one by one. */
  async listOnline(slug: string) {
    const [business] = await this.query(
      'SELECT "id" FROM "businesses" WHERE "slug" = $1 AND "is_published"',
      [slug],
    )
    if (!business) throw new NotFoundException('Бизнес не найден')
    if (!(await this.isSaleOpen(String(business.id)))) return []
    const rows = await this.query(
      `SELECT p."id", p."title", p."service_id" AS "serviceId", s."name" AS "serviceName",
         s."price" AS "servicePrice", p."visits", p."price", p."valid_days" AS "validDays"
       FROM "subscription_plans" p LEFT JOIN "services" s ON s."id" = p."service_id"
       WHERE p."business_id" = $1 AND p."is_active" AND p."is_online" AND p."price" > 0
         AND (p."service_id" IS NULL OR s."is_active")
       ORDER BY p."price"`,
      [business.id],
    )
    return rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      serviceId: row.serviceId === null ? null : String(row.serviceId),
      serviceName: row.serviceName === null ? null : String(row.serviceName),
      visits: toNumber(row.visits),
      price: toNumber(row.price),
      validDays: toNumber(row.validDays),
      fullPrice: fullPrice(
        toNumber(row.visits),
        row.servicePrice === null ? null : toNumber(row.servicePrice),
      ),
    }))
  }

  /** An online plan of this business that may be bought now (for a booking: covering its service). */
  async findOnlinePlan(businessId: string, planId: string) {
    const [plan] = await this.query(
      `SELECT p.*, bz."name" AS "business_name" FROM "subscription_plans" p
       JOIN "businesses" bz ON bz."id" = p."business_id"
       WHERE p."id" = $1 AND p."business_id" = $2 AND p."is_active" AND p."is_online" AND p."price" > 0`,
      [planId, businessId],
    )
    const isOpen = plan ? await this.isSaleOpen(businessId) : false
    if (!plan || !isOpen) throw new NotFoundException('Абонемент не продаётся онлайн')
    return plan
  }

  /** Places an order for a plan; `bookingId` when the client books with it. Returns the pay link. */
  async order(
    plan: Row,
    buyer: Buyer,
    bookingId: string | null = null,
  ): Promise<PlacedOrder & { checkoutUrl: string }> {
    if (!this.payments.isAvailable) {
      throw new ServiceUnavailableException('Оплата сейчас недоступна, попробуйте позже')
    }
    const dueAt = new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60_000)
    const [order] = await this.query(
      `INSERT INTO "subscription_orders" ("business_id", "plan_id", "customer_id", "phone", "title",
         "service_id", "visits", "valid_days", "amount", "booking_id", "due_at")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING "id"`,
      [
        plan.business_id,
        plan.id,
        buyer.customerId,
        buyer.phone,
        plan.title,
        plan.service_id,
        plan.visits,
        plan.valid_days,
        plan.price,
        bookingId,
        dueAt,
      ],
    )
    const placed = {
      id: String(order?.id),
      amount: toNumber(plan.price),
      title: String(plan.title),
      businessName: String(plan.business_name ?? ''),
    }
    const checkout = await this.payments
      .createOrderCheckout(KIND, placed.id, placed.amount, {
        description: `Абонемент «${placed.title}», ${placed.businessName}`,
        phone: buyer.phone,
      })
      .catch(async (error: unknown) => {
        await this.query(`UPDATE "subscription_orders" SET "status" = 'expired' WHERE "id" = $1`, [
          placed.id,
        ])
        throw error
      })

    return { ...placed, checkoutUrl: checkout.url }
  }

  /** How /pay shows an order. */
  async describe(id: string): Promise<PaymentOrder> {
    const [row] = await this.query(
      `SELECT o."title", o."visits", o."valid_days" AS "validDays", o."status", o."due_at" AS "dueAt",
         o."booking_id" AS "bookingId", bz."name", bz."slug"
       FROM "subscription_orders" o JOIN "businesses" bz ON bz."id" = o."business_id"
       WHERE o."id" = $1`,
      [id],
    )
    if (!row) throw new NotFoundException('Заказ не найден')
    const status = row.status as OrderStatus
    const isBooked = row.bookingId !== null

    return {
      kind: KIND,
      title: `Абонемент «${String(row.title)}»`,
      details: `${visitsWord(toNumber(row.visits))} на ${toNumber(row.validDays)} дн.${isBooked ? ' · этот визит первый' : ''}`,
      business: { name: String(row.name), slug: String(row.slug) },
      dueAt: status === 'pending' ? (row.dueAt as Date).toISOString() : null,
      status,
      doneText: isBooked
        ? 'Вы записаны, визит по абонементу. Он в профиле, в «Бонусы и абонементы».'
        : 'Он в профиле, в «Бонусы и абонементы».',
    }
  }

  /** The pay page of a held booking's order (to pay again from the ticket). */
  async checkoutForBooking(bookingId: string) {
    const [row] = await this.query(
      `SELECT p."id" FROM "payments" p
       JOIN "subscription_orders" o ON o."id" = p."order_id" AND p."kind" = $2
       WHERE o."booking_id" = $1 AND o."status" = 'pending' AND p."status" = 'pending'
       ORDER BY p."created_at" DESC LIMIT 1`,
      [bookingId, KIND],
    )
    if (!row) return null
    const id = String(row.id)
    return `/pay/${id}?s=${paymentSignature(id, this.config.get('AUTH_SECRET', { infer: true }))}`
  }

  /**
   * The order's payment went through: the subscription is issued once (the order row is locked,
   * so the acquirer's notification and the client's return cannot both issue it), dated by the
   * payment. The booking bought with it is then confirmed and paid by it.
   */
  async onPaid(orderId: string) {
    const issued = await this.dataSource.transaction(async (manager) => {
      const [order] = await this.queryWith(
        manager,
        'SELECT * FROM "subscription_orders" WHERE "id" = $1 FOR UPDATE',
        [orderId],
      )
      if (!order || !shouldIssue(order.status as OrderStatus)) return null
      const paidAt = new Date()
      const subscription = issuedSubscription(
        {
          title: String(order.title),
          serviceId: order.service_id === null ? null : String(order.service_id),
          visits: toNumber(order.visits),
          validDays: toNumber(order.valid_days),
          amount: toNumber(order.amount),
        },
        paidAt,
      )
      const [row] = await this.queryWith(
        manager,
        `INSERT INTO "client_subscriptions" ("business_id", "plan_id", "phone", "title", "service_id",
           "visits_total", "visits_left", "price_paid", "expires_on", "created_at")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING "id"`,
        [
          order.business_id,
          order.plan_id,
          order.phone,
          subscription.title,
          subscription.serviceId,
          subscription.visitsTotal,
          subscription.visitsLeft,
          subscription.pricePaid,
          subscription.expiresOn,
          subscription.createdAt,
        ],
      )
      const subscriptionId = String(row?.id)
      await this.queryWith(
        manager,
        `UPDATE "subscription_orders" SET "status" = 'paid', "paid_at" = $2, "subscription_id" = $3
         WHERE "id" = $1`,
        [orderId, paidAt, subscriptionId],
      )
      return {
        subscriptionId,
        bookingId: order.booking_id === null ? null : String(order.booking_id),
      }
    })
    if (issued?.bookingId) {
      await this.moduleRef
        .get(BookingPaymentsService, { strict: false })
        .onSubscriptionPaid(issued.bookingId, issued.subscriptionId)
    }

    return issued
  }

  /** Every minute: orders not paid within the hold expire, their payments fail. */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireOrders() {
    const result: unknown = await this.dataSource.query(
      `UPDATE "subscription_orders" SET "status" = 'expired'
       WHERE "status" = 'pending' AND "due_at" < now() RETURNING "id"`,
    )
    const rows = (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as {
      id: string
    }[]
    await this.payments.failPendingOrders(
      KIND,
      rows.map((row) => row.id),
    )
  }

  /** A plan bought with a booking must cover the booked service. */
  assertCovers(plan: Row, serviceId: string) {
    if (!coversService(plan.service_id === null ? null : String(plan.service_id), serviceId)) {
      throw new BadRequestException('Этот абонемент на другую услугу')
    }
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }

  private queryWith(manager: EntityManager, sql: string, params: unknown[]) {
    return manager.query(sql, params) as Promise<Row[]>
  }
}
