import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  type AvailabilityQuery,
  availabilityQuerySchema,
  bookingTokenSchema,
  type CreateBookingInput,
  createBookingSchema,
} from './bookings.schemas.js'
import { BookingsService } from './bookings.service.js'

const TOKEN_HEADER = 'x-booking-token'

const parseToken = (value: string | undefined) => {
  const result = bookingTokenSchema.safeParse(value)
  if (!result.success) throw new NotFoundException('Запись не найдена')

  return result.data
}

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('availability')
  getAvailability(@Query({ schema: availabilityQuerySchema }) query: AvailabilityQuery) {
    return this.bookingsService.getAvailability(query)
  }

  @Post('bookings')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(@Body({ schema: createBookingSchema }) body: CreateBookingInput) {
    return this.bookingsService.create(body)
  }

  @Get('bookings/:id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(TOKEN_HEADER) token: string | undefined,
  ) {
    return this.bookingsService.findByToken(id, parseToken(token))
  }

  @Delete('bookings/:id')
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Headers(TOKEN_HEADER) token: string | undefined) {
    return this.bookingsService.cancel(id, parseToken(token))
  }
}
