import {
  BadRequestException,
  Controller,
  Get,
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
}
