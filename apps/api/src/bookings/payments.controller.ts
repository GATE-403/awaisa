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
import { BookingsService } from './bookings.service.js'
import { PaymentsService } from './payments.service.js'

const TOKEN_HEADER = 'x-booking-token'

const requireSignature = (value: string | undefined) => {
  if (!value || value.length > 64) throw new BadRequestException('Нет подписи')
  return value
}

@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly bookings: BookingsService,
  ) {}

  // The cabinet shows the deposit field only when an acquirer is configured.
  @Get('payments/config')
  getConfig() {
    return { isAvailable: this.payments.isAvailable, driver: this.payments.driver }
  }

  // The pay page: amount, what it is for and whether it is still due. Opened by its signed link.
  @Get('payments/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Query('s') signature: string | undefined) {
    const payment = await this.payments.findSigned(id, requireSignature(signature))
    const view = await this.bookings.getView(payment.bookingId)

    return {
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      driver: this.payments.driver,
      // Freedom Pay's page for this payment; the test driver pays right on /pay.
      checkoutUrl: payment.checkoutUrl,
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
  ) {
    const { payment } = await this.payments.completeTest(id, requireSignature(signature))
    const view = await this.bookings.onPaid(payment.bookingId)

    return { bookingId: view.id, paymentStatus: view.payment?.status ?? null }
  }

  // Back from the acquirer's page: ask it how the payment stands, confirm the booking if paid.
  @Post('payments/:id/sync')
  @HttpCode(200)
  async sync(@Param('id', ParseUUIDPipe) id: string, @Query('s') signature: string | undefined) {
    const payment = await this.payments.findSigned(id, requireSignature(signature))
    await this.payments.sync(payment)
    const view =
      payment.status === 'succeeded'
        ? await this.bookings.onPaid(payment.bookingId)
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
    if (paid) await this.bookings.onPaid(paid.bookingId)

    return reply
  }

  // «Оплатить» on a ticket that still waits for its deposit: the current checkout link.
  @Get('bookings/:id/checkout')
  @UseGuards(OptionalAuthGuard)
  checkout(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(TOKEN_HEADER) token: string | undefined,
    @CurrentCustomer() customer: Customer | null,
  ) {
    return this.bookings.checkoutUrl(id, token ?? null, customer)
  }

  // «Напоминать в Telegram» on the success screen and the ticket: the bot link for this booking.
  @Get('bookings/:id/telegram')
  @UseGuards(OptionalAuthGuard)
  telegram(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(TOKEN_HEADER) token: string | undefined,
    @CurrentCustomer() customer: Customer | null,
  ) {
    return this.bookings.telegramLink(id, token ?? null, customer)
  }
}
