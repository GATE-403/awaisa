import type { PaymentOrder } from '@awaisa/contracts'
import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { Env } from '../config/env.js'
import { PAYMENT_HOLD_MINUTES } from './booking-rules.js'
import {
  type FreedomPayParams,
  freedomPayReply,
  isFreedomPaySignature,
  parseFreedomPayXml,
  salt,
  signFreedomPay,
} from './freedompay.js'
import { Payment } from './payment.entity.js'
import { isPaymentSignature, paymentSignature } from './payment-signature.js'

type Checkout = { paymentId: string; url: string }

type CheckoutDetails = { description: string; phone: string }

/** What a payment pays for: a booking's deposit, or an order of a registered kind. */
type PaymentTarget = { bookingId: string } | { kind: string; orderId: string }

/**
 * A kind of order paid through the same acquirer (a gift certificate, a subscription): the
 * module that sells it registers how to describe it on /pay and what to do once it is paid.
 */
type OrderHandler = {
  describe: (orderId: string) => Promise<PaymentOrder>
  /** Called once per successful payment; must be safe to call again for the same order. */
  onPaid: (orderId: string) => Promise<void>
}

// Freedom Pay calls this script with the result; its name takes part in the signatures.
const RESULT_SCRIPT = 'result'

// Deposits go through one acquirer at a time (PAYMENT_DRIVER):
// · test - built in: the checkout is our own /pay page with a «pay» button (dev, e2e);
// · freedompay - cards through Freedom Pay (init_payment.php → their page → result URL;
//   the status is always confirmed with get_status3.php; refunds via revoke.php).
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  get driver() {
    return this.config.get('PAYMENT_DRIVER', { infer: true })
  }

  get isAvailable() {
    return this.driver !== 'none'
  }

  private readonly orders = new Map<string, OrderHandler>()

  /** A module selling something else through these payments registers its kind (onModuleInit). */
  registerOrder(kind: string, handler: OrderHandler) {
    if (kind === 'booking') throw new Error('«booking» is the deposit kind')
    this.orders.set(kind, handler)
  }

  createCheckout(bookingId: string, amount: number, details: CheckoutDetails) {
    return this.createCheckoutFor({ bookingId }, amount, details)
  }

  createOrderCheckout(kind: string, orderId: string, amount: number, details: CheckoutDetails) {
    return this.createCheckoutFor({ kind, orderId }, amount, details)
  }

  /** How /pay shows an order that is not a booking. */
  describeOrder(payment: Payment) {
    return this.handlerFor(payment).describe(payment.orderId ?? '')
  }

  /** A successful payment of an order that is not a booking: its module takes it from here. */
  async onOrderPaid(payment: Payment) {
    if (payment.status !== 'succeeded') return
    await this.handlerFor(payment).onPaid(payment.orderId ?? '')
  }

  /** Fails the pending attempts of orders that ran out of time. */
  async failPendingOrders(kind: string, orderIds: string[]) {
    if (orderIds.length === 0) return
    await this.payments
      .createQueryBuilder()
      .update()
      .set({ status: 'failed' })
      .where('kind = :kind AND order_id IN (:...ids) AND status = :status', {
        kind,
        ids: orderIds,
        status: 'pending',
      })
      .execute()
  }

  private handlerFor(payment: Payment) {
    const handler = this.orders.get(payment.kind)
    if (!handler || !payment.orderId) throw new NotFoundException('Платёж не найден')
    return handler
  }

  private async createCheckoutFor(
    target: PaymentTarget,
    amount: number,
    details: CheckoutDetails,
  ): Promise<Checkout> {
    const payment = await this.payments.save(
      this.payments.create({
        ...('bookingId' in target
          ? { bookingId: target.bookingId, kind: 'booking', orderId: null }
          : { bookingId: null, kind: target.kind, orderId: target.orderId }),
        amount,
        provider: this.driver,
      }),
    )
    if (this.driver !== 'freedompay')
      return { paymentId: payment.id, url: this.payPagePath(payment.id) }

    const web = this.config.get('PUBLIC_WEB_URL', { infer: true })
    const back = `${web}${this.payPagePath(payment.id)}`
    const response = await this.callFreedomPay('init_payment.php', {
      pg_order_id: payment.id,
      pg_amount: String(amount),
      pg_currency: this.config.get('FREEDOMPAY_CURRENCY', { infer: true }),
      pg_description: details.description.slice(0, 1000),
      pg_lifetime: String(PAYMENT_HOLD_MINUTES * 60),
      pg_result_url: `${web}/api/payments/freedompay/${RESULT_SCRIPT}`,
      pg_request_method: 'POST',
      pg_success_url: back,
      pg_failure_url: back,
      pg_user_phone: details.phone.replace(/\D/g, ''),
      pg_language: 'ru',
      ...(this.config.get('FREEDOMPAY_TESTING_MODE', { infer: true })
        ? { pg_testing_mode: '1' }
        : {}),
    })
    if (response.pg_status !== 'ok' || !response.pg_redirect_url) {
      this.logger.error(`Freedom Pay init failed: ${response.pg_error_description ?? 'no answer'}`)
      payment.status = 'failed'
      await this.payments.save(payment)
      throw new ServiceUnavailableException('Оплата сейчас недоступна - попробуйте позже')
    }
    payment.providerRef = response.pg_payment_id ?? null
    payment.checkoutUrl = response.pg_redirect_url
    await this.payments.save(payment)

    return { paymentId: payment.id, url: response.pg_redirect_url }
  }

  /** The checkout of the latest attempt of a booking (to pay again from the ticket). */
  async checkoutFor(bookingId: string) {
    const payment = await this.payments.findOne({
      where: { bookingId, status: 'pending' },
      order: { createdAt: 'DESC' },
    })
    // Freedom Pay's page link is not kept; our /pay page sends the client on from there.
    return payment ? this.payPagePath(payment.id) : null
  }

  async findSigned(id: string, signature: string) {
    if (!isPaymentSignature(id, signature, this.secret())) {
      throw new NotFoundException('Платёж не найден')
    }
    const payment = await this.payments.findOneBy({ id })
    if (!payment) throw new NotFoundException('Платёж не найден')

    return payment
  }

  /** The test acquirer «charges» the card: only with PAYMENT_DRIVER=test. */
  async completeTest(id: string, signature: string) {
    if (this.driver !== 'test') throw new NotFoundException('Платёж не найден')
    const payment = await this.findSigned(id, signature)

    return this.markSucceeded(payment)
  }

  /**
   * Asks the acquirer how a payment stands (the client is back on /pay, or a notification came)
   * and records a success. The acquirer's own status is the truth, not what the browser says.
   */
  async sync(payment: Payment) {
    if (payment.status !== 'pending' || payment.provider !== 'freedompay') {
      return { payment, isNew: false }
    }
    const status = await this.callFreedomPay('get_status3.php', { pg_order_id: payment.id })
    if (status.pg_status !== 'ok') return { payment, isNew: false }
    if (status.pg_payment_status === 'success') {
      // A success for another amount or currency than we asked for is not this deposit paid.
      const currency = this.config.get('FREEDOMPAY_CURRENCY', { infer: true })
      const isOtherAmount =
        status.pg_amount !== undefined && Number(status.pg_amount) !== payment.amount
      const isOtherCurrency = status.pg_currency !== undefined && status.pg_currency !== currency
      if (isOtherAmount || isOtherCurrency) {
        this.logger.error(
          `Freedom Pay success for ${payment.id} with ${status.pg_amount} ${status.pg_currency}, expected ${payment.amount} ${currency}`,
        )
        return { payment, isNew: false }
      }
      payment.providerRef = status.pg_payment_id ?? payment.providerRef
      return this.markSucceeded(payment)
    }
    if (status.pg_payment_status === 'error' || status.pg_payment_status === 'failed') {
      payment.status = 'failed'
      await this.payments.save(payment)
    }

    return { payment, isNew: false }
  }

  /**
   * Freedom Pay's result notification. A forged one changes nothing: its signature is checked and
   * the status is confirmed with get_status3.php before anything is marked paid.
   */
  async handleFreedomPayResult(params: FreedomPayParams) {
    const secret = this.freedomPaySecret()
    if (!isFreedomPaySignature(RESULT_SCRIPT, params, secret)) {
      this.logger.warn('Freedom Pay result with a bad signature')
      return { reply: freedomPayReply(RESULT_SCRIPT, 'error', 'Bad signature', secret), paid: null }
    }
    const payment = params.pg_order_id
      ? await this.payments.findOneBy({ id: params.pg_order_id })
      : null
    if (!payment) {
      return { reply: freedomPayReply(RESULT_SCRIPT, 'error', 'Unknown order', secret), paid: null }
    }
    const { isNew } = await this.sync(payment)

    return {
      reply: freedomPayReply(RESULT_SCRIPT, 'ok', 'Принято', secret),
      paid: isNew ? payment : null,
    }
  }

  async failPending(bookingIds: string[]) {
    if (bookingIds.length === 0) return
    await this.payments
      .createQueryBuilder()
      .update()
      .set({ status: 'failed' })
      .where('booking_id IN (:...ids) AND status = :status', { ids: bookingIds, status: 'pending' })
      .execute()
  }

  /** Returns the deposit to the client's card. */
  async refund(bookingId: string) {
    const payment = await this.payments.findOneBy({ bookingId, status: 'succeeded' })
    if (!payment) return
    if (payment.provider === 'freedompay') {
      const result = await this.callFreedomPay('revoke.php', {
        pg_payment_id: payment.providerRef ?? '',
        pg_refund_amount: String(payment.amount),
      })
      if (result.pg_status !== 'ok') {
        // Left as succeeded: the next settle run does not retry, so it shows up in the log.
        this.logger.error(
          `Freedom Pay refund failed for ${payment.id}: ${result.pg_error_description ?? 'no answer'}`,
        )
        return
      }
    }
    payment.status = 'refunded'
    payment.refundedAt = new Date()
    await this.payments.save(payment)
    this.logger.log(`Refunded ${payment.amount} for booking ${bookingId} (${payment.provider})`)
  }

  private async markSucceeded(payment: Payment) {
    if (payment.status !== 'pending') return { payment, isNew: false }
    payment.status = 'succeeded'
    payment.paidAt = new Date()
    await this.payments.save(payment)

    return { payment, isNew: true }
  }

  private async callFreedomPay(script: string, fields: FreedomPayParams) {
    const params: FreedomPayParams = {
      ...fields,
      pg_merchant_id: this.config.get('FREEDOMPAY_MERCHANT_ID', { infer: true }) ?? '',
      pg_salt: salt(),
    }
    params.pg_sig = signFreedomPay(script, params, this.freedomPaySecret())
    try {
      const response = await fetch(
        `${this.config.get('FREEDOMPAY_API_URL', { infer: true })}/${script}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(params),
          signal: AbortSignal.timeout(15_000),
        },
      )
      return parseFreedomPayXml(await response.text())
    } catch (error) {
      this.logger.error(`Freedom Pay ${script} unreachable: ${(error as Error).message}`)
      return {} as FreedomPayParams
    }
  }

  private freedomPaySecret() {
    return this.config.get('FREEDOMPAY_SECRET_KEY', { infer: true }) ?? ''
  }

  private payPagePath(paymentId: string) {
    return `/pay/${paymentId}?s=${paymentSignature(paymentId, this.secret())}`
  }

  private secret() {
    return this.config.get('AUTH_SECRET', { infer: true })
  }
}

export type { OrderHandler }
