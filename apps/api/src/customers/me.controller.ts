import type { Booking, BusinessLink, Customer as CustomerView } from '@awaisa/contracts'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import { BookingsService } from '../bookings/bookings.service.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import type { Env } from '../config/env.js'
import { Customer } from './customer.entity.js'
import { toCustomerView } from './customer-view.js'
import { type UpdateProfileInput, updateProfileSchema } from './customers.schemas.js'

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    private readonly bookings: BookingsService,
    private readonly businesses: BusinessesService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** The account, with the places it runs and where it works as a master (profile shortcuts). */
  @Get()
  async getProfile(@CurrentCustomer() customer: Customer): Promise<CustomerView> {
    return {
      ...toCustomerView(customer, this.config.get('ADMIN_PHONES', { infer: true })),
      ...(await this.businesses.shortcutsFor(customer)),
    }
  }

  @Patch()
  async updateProfile(
    @CurrentCustomer() customer: Customer,
    @Body({ schema: updateProfileSchema }) body: UpdateProfileInput,
  ): Promise<CustomerView> {
    await this.customers.update({ id: customer.id }, { name: body.name })

    return toCustomerView(
      { ...customer, name: body.name },
      this.config.get('ADMIN_PHONES', { infer: true }),
    )
  }

  @Get('businesses')
  listBusinesses(@CurrentCustomer() customer: Customer): Promise<BusinessLink[]> {
    const isPlatformAdmin = this.config
      .get('ADMIN_PHONES', { infer: true })
      .includes(customer.phone)
    return this.businesses.listForCustomer(customer, isPlatformAdmin)
  }

  @Get('bookings')
  listBookings(@CurrentCustomer() customer: Customer): Promise<Booking[]> {
    return this.bookings.listForCustomer(customer)
  }

  @Post('bookings/:id/restore')
  @HttpCode(200)
  restoreBooking(
    @CurrentCustomer() customer: Customer,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Booking> {
    return this.bookings.restoreForCustomer(id, customer)
  }

  @Delete('bookings/:id')
  @HttpCode(200)
  cancelBooking(
    @CurrentCustomer() customer: Customer,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Booking> {
    return this.bookings.cancelForCustomer(id, customer)
  }
}
