import type {
  BillingCheckoutInput,
  BillingOrderView,
  BusinessBilling,
  PaymentOrder,
  SmsPack,
} from '@awaisa/contracts'
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { PaymentsService } from '../bookings/payments.service.js'
import type { Business } from '../businesses/business.entity.js'
import { returnedRows } from '../common/sql.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { SmsService } from '../notifications/sms.service.js'
import { TelegramBotService } from '../telegram/telegram-bot.service.js'
import { BillingService, toAccessView, toPlanView } from './billing.service.js'
import { formatDay, orderTitle, reminderText } from './billing-messages.js'
import { extendUntil, PERIODS, periodPrice, reminderDue, resolveAccess } from './plan-rules.js'

/** `payments.kind` of plan and SMS pack orders. */
const PAYMENT_KIND = 'billing'
/** How long an unpaid order waits for its payment. */
const ORDER_HOLD_MINUTES = 60

type OrderRow = {
  id: string
  businessId: string
  kind: 'plan' | 'sms'
  planKey: string | null
  months: number | null
  smsCount: number | null
  amount: number
  status: 'pending' | 'paid' | 'expired'
  dueAt: Date
  paidAt: Date | null
}

const ORDER_COLUMNS = `"id", "business_id" AS "businessId", "kind", "plan_key" AS "planKey",
  "months", "sms_count" AS "smsCount", "amount", "status", "due_at" AS "dueAt", "paid_at" AS "paidAt"`

/**
 * Paying for the plan and SMS packs through the same acquirer as deposits (`payments`, kind
 * 'billing'), the «Тариф» overview, platform admins' manual extension and the owners' reminders.
 */
@Injectable()
export class BillingOrdersService implements OnModuleInit {
  private readonly logger = new Logger(BillingOrdersService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly billing: BillingService,
    private readonly payments: PaymentsService,
    private readonly telegram: TelegramBotService,
    private readonly sms: SmsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit() {
    this.payments.registerOrder(PAYMENT_KIND, {
      describe: (orderId) => this.describe(orderId),
      onPaid: (orderId) => this.onPaid(orderId),
    })
  }

  async overview(business: Business): Promise<BusinessBilling> {
    const { access, plan, plans } = await this.billing.access(business.id)
    const [masters, branches, usage, packs, orders] = await Promise.all([
      this.billing.countMasters(business.id),
      this.billing.countBranches(business.id),
      this.billing.smsUsage(business.id),
      this.smsPacks(),
      this.paidOrders(business.id),
    ])
    const publicPlans = plans.filter((row) => row.isPublic)
    const paid = publicPlans
      .filter((row) => row.monthlyPrice > 0)
      .sort((a, b) => a.monthlyPrice - b.monthlyPrice)[0]

    return {
      access: toAccessView(access, plan, plans),
      plans: publicPlans.map(toPlanView),
      smsPacks: packs,
      usage: {
        masters,
        branches,
        smsSent: usage.sent,
        smsAllowance: usage.allowance,
        smsExtra: usage.extra,
      },
      prices: paid
        ? PERIODS.map((months) => ({ months, amount: periodPrice(paid, masters, months) }))
        : [],
      paidPlanKey: paid?.key ?? null,
      orders,
      isPaymentAvailable: this.payments.isAvailable,
    }
  }

  async checkout(business: Business, customer: Customer, input: BillingCheckoutInput) {
    if (!this.payments.isAvailable) {
      throw new BadRequestException('Оплата сейчас недоступна: напишите нам, продлим вручную')
    }
    const order = await this.createOrder(business, customer, input)
    const { url } = await this.payments.createOrderCheckout(PAYMENT_KIND, order.id, order.amount, {
      description: `${orderTitle({ ...order, planTitle: order.planTitle })}, ${business.name}`,
      phone: customer.phone,
    })

    return { url }
  }

  /** Platform admins: months of a plan (from the later of now and the paid end) or for good. */
  async extend(
    business: Business,
    input: { planKey: string; months?: number; isLifetime?: boolean },
  ) {
    if (input.isLifetime) {
      await this.billing.makeLifetime(business.id, input.planKey)
    } else {
      await this.billing.extend(business.id, input.planKey, input.months ?? 1)
    }
    this.logger.log(
      `Plan of ${business.slug} set by an admin: ${input.planKey} ${input.isLifetime ? 'for good' : `+${input.months ?? 1} mo`}`,
    )
    return this.overview(business)
  }

  /** Every day at 10:00 Bishkek: owners hear three days before the end and once it has ended. */
  @Cron('0 4 * * *')
  async remindEnds(now = new Date()) {
    const rows = (await this.dataSource.query(
      `SELECT s."business_id" AS "businessId", s."plan_key" AS "planKey",
         s."trial_ends_at" AS "trialEndsAt", s."paid_until" AS "paidUntil",
         s."is_lifetime" AS "isLifetime", s."last_reminder" AS "lastReminder",
         b."name", b."slug"
       FROM "business_subscriptions" s JOIN "businesses" b ON b."id" = s."business_id"
       WHERE NOT s."is_lifetime"
         AND GREATEST(s."trial_ends_at", s."paid_until") BETWEEN $1::timestamptz - interval '8 days'
           AND $1::timestamptz + interval '4 days'`,
      [now],
    )) as {
      businessId: string
      planKey: string
      trialEndsAt: Date | null
      paidUntil: Date | null
      isLifetime: boolean
      lastReminder: string | null
      name: string
      slug: string
    }[]
    const plans = await this.billing.plans()
    const web = this.config.get('PUBLIC_WEB_URL', { infer: true })
    for (const row of rows) {
      const access = resolveAccess(row, now)
      const due = reminderDue(access, row.lastReminder, now)
      if (!due || !access.endsAt) continue
      // Claimed first: a second instance or a rerun says nothing twice.
      const claimed = returnedRows(
        await this.dataSource.query(
          `UPDATE "business_subscriptions" SET "last_reminder" = $2
           WHERE "business_id" = $1 AND "last_reminder" IS DISTINCT FROM $2 RETURNING 1`,
          [row.businessId, due.key],
        ),
      )
      if (claimed.length === 0) continue
      const text = reminderText(due.stage, {
        businessName: row.name,
        planTitle: plans.find((plan) => plan.key === row.planKey)?.title ?? '',
        isTrial: !row.paidUntil || (row.trialEndsAt !== null && row.trialEndsAt > row.paidUntil),
        endsAt: access.endsAt,
        link: `${web}/manage/${row.slug}?tab=billing`,
      })
      void this.telegram.notifyBusiness(row.businessId, escapeHtml(text))
      for (const phone of await this.ownerPhones(row.businessId)) {
        void this.sms.sendSafely(phone, text)
      }
    }
  }

  private async createOrder(business: Business, customer: Customer, input: BillingCheckoutInput) {
    if (input.kind === 'sms') {
      const pack = (await this.smsPacks()).find((row) => row.key === input.packKey)
      if (!pack) throw new NotFoundException('Пакет не найден')
      const order = await this.insertOrder(business.id, customer.id, {
        kind: 'sms',
        planKey: null,
        months: null,
        smsCount: pack.size,
        amount: pack.price,
      })
      return { ...order, planTitle: null }
    }
    const plan = await this.billing.plan(input.planKey)
    const isPeriod = (PERIODS as readonly number[]).includes(input.months)
    if (!plan.isPublic || plan.monthlyPrice <= 0 || !isPeriod) {
      throw new BadRequestException('Этот тариф так не оплатить')
    }
    const masters = await this.billing.countMasters(business.id)
    const order = await this.insertOrder(business.id, customer.id, {
      kind: 'plan',
      planKey: plan.key,
      months: input.months,
      smsCount: null,
      amount: periodPrice(plan, masters, input.months),
    })
    return { ...order, planTitle: plan.title }
  }

  private async insertOrder(
    businessId: string,
    customerId: string,
    order: Pick<OrderRow, 'kind' | 'planKey' | 'months' | 'smsCount' | 'amount'>,
  ) {
    const [row] = (await this.dataSource.query(
      `INSERT INTO "plan_orders" ("business_id", "customer_id", "kind", "plan_key", "months",
         "sms_count", "amount", "due_at")
       VALUES ($1, $2, $3, $4, $5, $6, $7, now() + make_interval(mins => $8))
       RETURNING ${ORDER_COLUMNS}`,
      [
        businessId,
        customerId,
        order.kind,
        order.planKey,
        order.months,
        order.smsCount,
        order.amount,
        ORDER_HOLD_MINUTES,
      ],
    )) as OrderRow[]
    if (!row) throw new Error('plan order not saved')
    return row
  }

  private async findOrder(id: string) {
    const [row] = (await this.dataSource.query(
      `SELECT ${ORDER_COLUMNS} FROM "plan_orders" WHERE "id" = $1`,
      [id],
    )) as OrderRow[]
    if (!row) throw new NotFoundException('Заказ не найден')
    return row
  }

  private async describe(orderId: string): Promise<PaymentOrder> {
    const order = await this.findOrder(orderId)
    const [business] = (await this.dataSource.query(
      'SELECT "name", "slug" FROM "businesses" WHERE "id" = $1',
      [order.businessId],
    )) as { name: string; slug: string }[]
    const planTitle = order.planKey ? (await this.billing.plan(order.planKey)).title : null
    const isExpired = order.status === 'pending' && order.dueAt < new Date()
    // Shown once paid: before that the end is where this payment would take it.
    const subscription = await this.billing.subscription(order.businessId)
    const paidUntil =
      order.status === 'paid'
        ? subscription?.paidUntil
        : extendUntil(subscription, new Date(), order.months ?? 1)
    const doneText =
      order.kind === 'sms'
        ? `Добавили ${order.smsCount ?? 0} SMS`
        : paidUntil
          ? `Тариф «${planTitle ?? ''}» оплачен до ${formatDay(paidUntil)}`
          : 'Тариф оплачен'

    return {
      kind: PAYMENT_KIND,
      title: orderTitle({ ...order, planTitle }),
      details: business?.name ?? '',
      business: { name: business?.name ?? '', slug: business?.slug ?? '' },
      dueAt: order.status === 'pending' && !isExpired ? order.dueAt.toISOString() : null,
      status: order.status === 'paid' ? 'paid' : isExpired ? 'expired' : 'pending',
      doneText,
    }
  }

  /** Claimed once (pending → paid), then the plan is extended or the SMS added. */
  private async onPaid(orderId: string) {
    const claimed = returnedRows(
      await this.dataSource.query(
        `UPDATE "plan_orders" SET "status" = 'paid', "paid_at" = now()
         WHERE "id" = $1 AND "status" <> 'paid' RETURNING "id"`,
        [orderId],
      ),
    )
    if (claimed.length === 0) return
    const order = await this.findOrder(orderId)
    if (order.kind === 'sms') {
      await this.billing.addSms(order.businessId, order.smsCount ?? 0)
    } else if (order.planKey) {
      const until = await this.billing.extend(order.businessId, order.planKey, order.months ?? 1)
      this.logger.log(
        `Plan ${order.planKey} of ${order.businessId} paid until ${until.toISOString()}`,
      )
    }
  }

  private async smsPacks(): Promise<SmsPack[]> {
    return (await this.dataSource.query(
      'SELECT "key", "size", "price" FROM "sms_packs" ORDER BY "position"',
    )) as SmsPack[]
  }

  private async paidOrders(businessId: string): Promise<BillingOrderView[]> {
    const rows = (await this.dataSource.query(
      `SELECT o."id", o."kind", o."months", o."sms_count" AS "smsCount", o."amount",
         o."paid_at" AS "paidAt", p."title" AS "planTitle"
       FROM "plan_orders" o LEFT JOIN "plans" p ON p."key" = o."plan_key"
       WHERE o."business_id" = $1 AND o."status" = 'paid'
       ORDER BY o."paid_at" DESC LIMIT 12`,
      [businessId],
    )) as (Pick<OrderRow, 'id' | 'kind' | 'months' | 'smsCount' | 'amount'> & {
      paidAt: Date
      planTitle: string | null
    })[]
    return rows.map((row) => ({
      id: row.id,
      title: orderTitle(row),
      amount: row.amount,
      paidAt: row.paidAt.toISOString(),
    }))
  }

  private async ownerPhones(businessId: string) {
    const rows = (await this.dataSource.query(
      `SELECT c."phone" FROM "business_members" m JOIN "customers" c ON c."id" = m."customer_id"
       WHERE m."business_id" = $1 AND m."role" = 'owner'`,
      [businessId],
    )) as { phone: string }[]
    return rows.map((row) => row.phone)
  }
}

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

export { PAYMENT_KIND }
