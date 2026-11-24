import type {
  BookingTelegramLink,
  CheckoutLink,
  PaymentPage,
  PaymentSync,
  PaymentsConfig,
  TestPaymentResult,
} from '@awaisa/contracts'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { CurrentCustomer, OptionalAuthGuard } from '../auth/auth.guard.js'
import type { Customer } from '../customers/customer.entity.js'
import { BookingPaymentsService } from './booking-payments.service.js'
import { BookingsService } from './bookings.service.js'
import { PaymentsService } from './payments.service.js'

const TOKEN_HEADER = 'x-booking-token'

const requireSignature = (value: string | undefined) => {
  if (!value || value.length > 64) throw new BadRequestException('Missing signature')
  return value
}

@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly bookings: BookingsService,
    private readonly bookingPayments: BookingPaymentsService,
  ) {}

  // The cabinet shows the deposit field only when an acquirer is configured.
  @Get('payments/config')
  getConfig(): PaymentsConfig {
    return { isAvailable: this.payments.isAvailable, driver: this.payments.driver }
  }

  // The pay page: amount, what it is for and whether it is still due. Opened by its signed link.
  @Get('payments/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('s') signature: string | undefined,
  ): Promise<PaymentPage> {
    const payment = await this.payments.findSigned(id, requireSignature(signature))
    const base = {
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      driver: this.payments.driver,
      // Freedom Pay's page for this payment; the test driver pays right on /pay.
      checkoutUrl: payment.checkoutUrl,
    }
    if (!payment.bookingId) {
      return { ...base, booking: null, order: await this.payments.describeOrder(payment) }
    }
    const view = await this.bookings.getView(payment.bookingId)

    return {
      ...base,
      order: null,
      booking: {
        id: view.id,
        serviceName: view.serviceName,
        specialistName: view.specialistName,
        date: view.date,
        time: view.time,
        price: view.price,
        paymentStatus: view.payment?.status ?? null,
        dueAt: view.payment?.dueAt ?? null,
        business: { name: view.business.name, slug: view.business.slug },
      },
    }
  }

  // The built-in test acquirer: «pay» completes the payment and confirms the booking.
  @Post('payments/:id/test-complete')
  @HttpCode(200)
  async completeTest(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('s') signature: string | undefined,
  ): Promise<TestPaymentResult> {
    const { payment } = await this.payments.completeTest(id, requireSignature(signature))
    if (!payment.bookingId) {
      await this.payments.onOrderPaid(payment)
      return { bookingId: null, paymentStatus: null }
    }
    const view = await this.bookingPayments.onPaid(payment.bookingId)

    return { bookingId: view.id, paymentStatus: view.payment?.status ?? null }
  }

  // Back from the acquirer's page: ask it how the payment stands, confirm the booking if paid.
  @Post('payments/:id/sync')
  @HttpCode(200)
  async sync(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('s') signature: string | undefined,
  ): Promise<PaymentSync> {
    const payment = await this.payments.findSigned(id, requireSignature(signature))
    await this.payments.sync(payment)
    if (!payment.bookingId) {
      await this.payments.onOrderPaid(payment)
      return { bookingId: null, status: payment.status, paymentStatus: null }
    }
    const view =
      payment.status === 'succeeded'
        ? await this.bookingPayments.onPaid(payment.bookingId)
        : await this.bookings.getView(payment.bookingId)

    return {
      bookingId: view.id,
      status: payment.status,
      paymentStatus: view.payment?.status ?? null,
    }
  }

  // Freedom Pay's result URL (form POST): answered with signed XML, retried by them on failure.
  @Post('payments/freedompay/result')
  @HttpCode(200)
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async freedomPayResult(@Body() body: Record<string, unknown>) {
    const params = Object.fromEntries(
      Object.entries(body ?? {}).map(([key, value]) => [key, String(value ?? '')]),
    )
    const { reply, paid } = await this.payments.handleFreedomPayResult(params)
    if (paid?.bookingId) await this.bookingPayments.onPaid(paid.bookingId)
    else if (paid) await this.payments.onOrderPaid(paid)

    return reply
  }

  // 'Pay' on a ticket that still waits for its deposit: the current checkout link.
  @Get('bookings/:id/checkout')
  @UseGuards(OptionalAuthGuard)
  checkout(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(TOKEN_HEADER) token: string | undefined,
    @CurrentCustomer() customer: Customer | null,
  ): Promise<CheckoutLink> {
    return this.bookingPayments.checkoutUrl(id, token ?? null, customer)
  }

  // 'Remind me in Telegram' on the success screen and the ticket: the bot link for this booking.
  @Get('bookings/:id/telegram')
  @UseGuards(OptionalAuthGuard)
  telegram(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(TOKEN_HEADER) token: string | undefined,
    @CurrentCustomer() customer: Customer | null,
  ): Promise<BookingTelegramLink> {
    return this.bookings.telegramLink(id, token ?? null, customer)
  }
}
