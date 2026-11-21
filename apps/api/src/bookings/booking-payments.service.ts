import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CacheService } from '../cache/cache.service.js'
import { Customer } from '../customers/customer.entity.js'
import { ClientMessagesService } from '../notifications/client-messages.service.js'
import { confirmationMessage } from '../notifications/messages.js'
import { PushService } from '../push/push.service.js'
import { TelegramBotService } from '../telegram/telegram-bot.service.js'
import { newBookingText } from '../telegram/telegram-messages.js'
import { Booking } from './booking.entity.js'
import { DEPOSIT_REFUND_HOURS, UNDO_WINDOW_SECONDS } from './booking-rules.js'
import { BookingsService } from './bookings.service.js'
import { PaymentsService } from './payments.service.js'

/** Deposits on bookings: the pay link, a payment coming through, and releasing unpaid holds. */
@Injectable()
export class BookingPaymentsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    private readonly bookingsService: BookingsService,
    private readonly payments: PaymentsService,
    private readonly clientMessages: ClientMessagesService,
    private readonly telegram: TelegramBotService,
    private readonly push: PushService,
    private readonly cache: CacheService,
  ) {}

  /** The pay page for a booking still waiting for its deposit (to pay again from the ticket). */
  async checkoutUrl(id: string, token: string | null, customer: Customer | null) {
    const booking = await this.bookingsService.findAccessible(id, token, customer)
    if (!booking) throw new NotFoundException('Запись не найдена')
    if (booking.paymentStatus !== 'pending') throw new BadRequestException('Оплата не нужна')
    const url = await this.payments.checkoutFor(id)
    if (!url) throw new NotFoundException('Платёж не найден')

    return { url }
  }

  /**
   * The deposit went through: the booking is final — confirmation SMS and the owner's message
   * now. Paid after the hold ran out (the slot was released): the money goes straight back.
   */
  async onPaid(bookingId: string) {
    const result = await this.bookings.update(
      { id: bookingId, paymentStatus: 'pending' },
      { paymentStatus: 'paid', paymentDueAt: null },
    )
    if (!result.affected) {
      const booking = await this.bookings.findOneBy({ id: bookingId })
      if (booking?.paymentStatus === 'expired') {
        await this.payments.refund(bookingId)
        await this.bookings.update({ id: bookingId }, { paymentStatus: 'refunded' })
      }
      return this.bookingsService.getView(bookingId)
    }

    const booking = await this.bookings.findOneByOrFail({ id: bookingId })
    const view = await this.bookingsService.getView(bookingId)
    if (booking.smsConfirmation) {
      void this.clientMessages.send(
        booking.customerPhone,
        confirmationMessage(view, this.bookingsService.linkTo(view.id)),
        this.bookingsService.manageButton(view.id),
      )
    }
    void this.telegram.notifyBusiness(
      booking.businessId,
      newBookingText(view.business.name, view.date, {
        ...view,
        customerPhone: booking.customerPhone,
      }),
    )
    void this.push.notifyBooking('created', view, booking.businessId)

    return view
  }

  /**
   * Every minute: unpaid holds past their time are released; deposits of cancelled visits are
   * settled once the undo window has passed — returned when the salon cancelled or the client
   * did it early enough, kept otherwise. Claimed with UPDATE … RETURNING, safe on several instances.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async settlePayments() {
    const expired = await this.claim(
      `UPDATE "bookings" SET "status" = 'cancelled', "cancelled_at" = now(), "payment_status" = 'expired'
       WHERE "payment_status" = 'pending' AND "payment_due_at" < now() AND "status" = 'confirmed'
       RETURNING "id"`,
    )
    await this.payments.failPending(expired.map((row) => row.id))
    // Released holds free their slots: cached free time must not keep them busy.
    if (expired.length > 0) await this.cache.bump(['availability'])

    const settled = await this.claim(
      `UPDATE "bookings" SET "payment_status" = CASE
         WHEN "cancelled_by" = 'salon'
           OR "starts_at" - "cancelled_at" >= make_interval(hours => ${DEPOSIT_REFUND_HOURS})
         THEN 'refunded' ELSE 'kept' END
       WHERE "status" = 'cancelled' AND "payment_status" = 'paid'
         AND "cancelled_at" < now() - make_interval(secs => ${UNDO_WINDOW_SECONDS})
       RETURNING "id", "payment_status"`,
    )
    for (const row of settled) {
      if (row.payment_status === 'refunded') await this.payments.refund(row.id)
    }
  }

  private async claim(sql: string) {
    const result: unknown = await this.bookings.manager.query(sql)
    // TypeORM returns [rows, affected] for UPDATE … RETURNING on Postgres.
    return (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as {
      id: string
      payment_status?: string
    }[]
  }
}
