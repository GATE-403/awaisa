import type { CertificateOrderCreated, CertificateSale, PaymentOrder } from '@awaisa/contracts'
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { BillingService } from '../billing/billing.service.js'
import { PaymentsService } from '../bookings/payments.service.js'
import { normalizePhone } from '../common/phone.js'
import { returnedRows } from '../common/sql.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { LoyaltyService } from '../loyalty/loyalty.service.js'
import { ClientMessagesService } from '../notifications/client-messages.service.js'
import { TelegramBotService } from '../telegram/telegram-bot.service.js'
import { escapeHtml } from '../telegram/telegram-messages.js'
import {
  buyerMessage,
  formatSom,
  orderDetails,
  orderDueAt,
  type PaidOrder,
  recipientMessage,
} from './certificate-sale.js'
import type { CertificateOrderBody } from './certificates.schemas.js'

type Row = Record<string, unknown>

/** The payment kind of a certificate order (`payments.kind`). */
const KIND = 'certificate'

/**
 * Gift certificates bought by clients on the place's page. An order waits for its payment
 * (the same acquirer as deposits); only a confirmed payment issues the certificate, whose code
 * then goes to the buyer and the recipient. An order nobody paid expires.
 */
@Injectable()
export class CertificateSalesService implements OnModuleInit {
  private readonly logger = new Logger(CertificateSalesService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly payments: PaymentsService,
    private readonly loyalty: LoyaltyService,
    private readonly clientMessages: ClientMessagesService,
    private readonly telegram: TelegramBotService,
    private readonly config: ConfigService<Env, true>,
    private readonly billing: BillingService,
  ) {}

  onModuleInit() {
    this.payments.registerOrder(KIND, {
      describe: (orderId) => this.describe(orderId),
      onPaid: (orderId) => this.onPaid(orderId),
    })
  }

  /** What the place's page offers; no amounts when it sells none (or payments are off). */
  async saleFor(slug: string): Promise<CertificateSale> {
    const business = await this.findBusiness(slug)
    return { amounts: business?.amounts ?? [] }
  }

  async createOrder(
    slug: string,
    input: CertificateOrderBody,
    customer: Customer | null,
  ): Promise<CertificateOrderCreated> {
    const business = await this.findBusiness(slug)
    if (!business) throw new NotFoundException('Gift cards are not sold here')
    if (!business.amounts.includes(input.amount)) {
      throw new BadRequestException('Pick one of the amounts offered')
    }
    const buyerPhone = customer?.phone ?? normalizePhone(input.buyerPhone)
    if (!buyerPhone) throw new BadRequestException('Check your phone number')
    const recipientPhone = input.recipientPhone ? normalizePhone(input.recipientPhone) : null
    if (input.recipientPhone && !recipientPhone) {
      throw new BadRequestException("Check the recipient's number")
    }

    const [order] = await this.query(
      `INSERT INTO "certificate_orders" ("business_id", "customer_id", "amount", "buyer_name",
         "buyer_phone", "recipient_name", "recipient_phone", "message", "due_at")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING "id"`,
      [
        business.id,
        customer?.id ?? null,
        input.amount,
        input.buyerName,
        buyerPhone,
        input.recipientName,
        recipientPhone === buyerPhone ? null : recipientPhone,
        input.message,
        orderDueAt(new Date()),
      ],
    )
    const id = String(order?.id)
    try {
      const checkout = await this.payments.createOrderCheckout(KIND, id, input.amount, {
        description: `${business.name} gift card, ${formatSom(input.amount)}`,
        phone: buyerPhone,
      })
      return { id, checkoutUrl: checkout.url }
    } catch (error) {
      // The acquirer is down: nothing waits for a payment that cannot happen.
      await this.query(`UPDATE "certificate_orders" SET "status" = 'expired' WHERE "id" = $1`, [id])
      throw error
    }
  }

  async describe(orderId: string): Promise<PaymentOrder> {
    const [row] = await this.query(
      `SELECT o.*, bz."name" AS "business_name", bz."slug" AS "business_slug"
       FROM "certificate_orders" o JOIN "businesses" bz ON bz."id" = o."business_id"
       WHERE o."id" = $1`,
      [orderId],
    )
    if (!row) throw new NotFoundException('Payment not found')
    const status = String(row.status) as PaymentOrder['status']
    return {
      kind: KIND,
      // A no-break space keeps «3,000 som» on one line on the pay page.
      title: `Gift card, ${formatSom(Number(row.amount)).replace(/ /g, '\u00a0')}`,
      details: orderDetails(String(row.recipient_name), String(row.buyer_name)),
      business: { name: String(row.business_name), slug: String(row.business_slug) },
      dueAt: status === 'pending' ? new Date(String(row.due_at)).toISOString() : null,
      status,
      doneText: row.recipient_phone
        ? 'We have sent the gift card code to you and the recipient.'
        : 'We have sent the gift card code to you: pass it on to the recipient.',
    }
  }

  /**
   * The payment is confirmed: the order is claimed once (a second notification finds it paid),
   * the certificate issued and its code sent. Paid after the order expired (the acquirer was
   * late) still issues it: the money came, and a certificate takes no one's time.
   */
  async onPaid(orderId: string) {
    // One transaction: a failure leaves the order unpaid, and the next notification (or the
    // client's return to /pay) tries again instead of finding it paid without a certificate.
    const issued = await this.dataSource.transaction(async (manager) => {
      const [order] = returnedRows(
        await manager.query(
          `UPDATE "certificate_orders" SET "status" = 'paid', "paid_at" = now()
           WHERE "id" = $1 AND "status" <> 'paid' RETURNING *`,
          [orderId],
        ),
      )
      if (!order) return null
      const recipientPhone = order.recipient_phone ? String(order.recipient_phone) : null
      const certificate = await this.loyalty.issueCertificate(
        String(order.business_id),
        {
          amount: Number(order.amount),
          recipient: String(order.recipient_name || order.buyer_name),
          phone: recipientPhone ?? String(order.buyer_phone),
          expiresOn: null,
        },
        manager,
      )
      await manager.query('UPDATE "certificate_orders" SET "certificate_id" = $2 WHERE "id" = $1', [
        orderId,
        certificate.id,
      ])
      return { order, certificate, recipientPhone }
    })
    if (!issued) return

    const { order, certificate, recipientPhone } = issued
    const businessId = String(order.business_id)
    const buyerPhone = String(order.buyer_phone)
    const [business] = await this.query('SELECT "name", "slug" FROM "businesses" WHERE "id" = $1', [
      businessId,
    ])
    const link = `${this.config.get('PUBLIC_WEB_URL', { infer: true })}/${String(business?.slug)}/book`
    const paid: PaidOrder = {
      business: String(business?.name ?? ''),
      amount: certificate.amount,
      code: certificate.code,
      buyerName: String(order.buyer_name),
      recipientName: String(order.recipient_name),
      hasRecipientPhone: recipientPhone !== null,
      message: String(order.message),
      link,
    }
    const button = { label: 'Book', url: link }
    await this.clientMessages.send(buyerPhone, { text: buyerMessage(paid), link: button })
    if (recipientPhone) {
      await this.clientMessages.send(recipientPhone, { text: recipientMessage(paid), link: button })
    }
    void this.telegram.notifyBusiness(
      businessId,
      `🎁 <b>Gift card sold</b>, ${formatSom(paid.amount)} · ${escapeHtml(paid.business)}\nFrom ${escapeHtml(paid.buyerName)}${paid.recipientName ? ` for ${escapeHtml(paid.recipientName)}` : ''}, code ${paid.code}`,
    )
    this.logger.log(`Certificate ${certificate.code} issued for order ${orderId}`)
  }

  /** Every minute: orders nobody paid in time expire, and their payment attempts fail. */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireOrders() {
    const rows = await this.query(
      `UPDATE "certificate_orders" SET "status" = 'expired'
       WHERE "status" = 'pending' AND "due_at" < now() RETURNING "id"`,
      [],
    )
    const expired = returnedRows(rows)
    await this.payments.failPendingOrders(
      KIND,
      expired.map((row) => String(row.id)),
    )
  }

  private async findBusiness(slug: string) {
    if (!this.payments.isAvailable) return null
    const [row] = await this.query(
      `SELECT "id", "name", "certificate_amounts" AS "amounts" FROM "businesses"
       WHERE "slug" = $1 AND "is_published" AND "certificates_online"`,
      [slug],
    )
    const amounts = ((row?.amounts as number[] | undefined) ?? []).map(Number)
    if (!row || amounts.length === 0) return null
    // Selling online is part of loyalty: a plan without it sells nothing (the cabinet locks it too).
    if (!(await this.billing.hasFeature(String(row.id), 'loyalty'))) return null
    return { id: String(row.id), name: String(row.name), amounts }
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
