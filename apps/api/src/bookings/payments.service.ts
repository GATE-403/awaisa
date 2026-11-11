import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { Env } from '../config/env.js'
import { Payment } from './payment.entity.js'
import { isPaymentSignature, paymentSignature } from './payment-signature.js'

type Checkout = { paymentId: string; url: string }

// Deposits go through one acquirer at a time (PAYMENT_DRIVER). `test` is built in: its checkout
// is our own /pay page with a «pay» button, so the whole flow runs locally and in e2e.
// A real acquirer adds a driver here: create its checkout, take its webhook, call its refund.
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

  async createCheckout(bookingId: string, amount: number): Promise<Checkout> {
    const payment = await this.payments.save(
      this.payments.create({ bookingId, amount, provider: this.driver }),
    )

    return { paymentId: payment.id, url: this.checkoutUrl(payment.id) }
  }

  /** The pay page for the latest attempt of a booking (to pay again from the ticket). */
  async checkoutFor(bookingId: string) {
    const payment = await this.payments.findOne({
      where: { bookingId, status: 'pending' },
      order: { createdAt: 'DESC' },
    })
    return payment ? this.checkoutUrl(payment.id) : null
  }

  async findSigned(id: string, signature: string) {
    if (!isPaymentSignature(id, signature, this.secret()))
      throw new NotFoundException('Платёж не найден')
    const payment = await this.payments.findOneBy({ id })
    if (!payment) throw new NotFoundException('Платёж не найден')

    return payment
  }

  /** The test acquirer «charges» the card: only with PAYMENT_DRIVER=test. */
  async completeTest(id: string, signature: string) {
    if (this.driver !== 'test') throw new NotFoundException('Платёж не найден')
    const payment = await this.findSigned(id, signature)
    if (payment.status !== 'pending') return { payment, isNew: false }
    payment.status = 'succeeded'
    payment.paidAt = new Date()
    await this.payments.save(payment)

    return { payment, isNew: true }
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

  /** Returns the deposit to the client's card (the test acquirer just records it). */
  async refund(bookingId: string) {
    const payment = await this.payments.findOneBy({ bookingId, status: 'succeeded' })
    if (!payment) return
    payment.status = 'refunded'
    payment.refundedAt = new Date()
    await this.payments.save(payment)
    this.logger.log(`Refunded ${payment.amount} сом for booking ${bookingId} (${payment.provider})`)
  }

  // The test acquirer is our own page on the same site, so its link is a path: it works on
  // whichever origin the client booked from (localhost, a preview, the app's WebView).
  private checkoutUrl(paymentId: string) {
    return `/pay/${paymentId}?s=${paymentSignature(paymentId, this.secret())}`
  }

  private secret() {
    return this.config.get('AUTH_SECRET', { infer: true })
  }
}
