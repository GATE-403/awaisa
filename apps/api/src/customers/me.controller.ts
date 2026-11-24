import type {
  AccountDeleted,
  AccountExport,
  Booking,
  BusinessLink,
  Customer as CustomerView,
} from '@awaisa/contracts'
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
  Res,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import { SESSION_COOKIE } from '../auth/auth.constants.js'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import { BookingsService } from '../bookings/bookings.service.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import type { Env } from '../config/env.js'
import { AccountService } from './account.service.js'
import type { Customer } from './customer.entity.js'
import { toCustomerView } from './customer-view.js'
import { type UpdateProfileInput, updateProfileSchema } from './customers.schemas.js'
import { CustomersService } from './customers.service.js'

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(
    private readonly customers: CustomersService,
    private readonly bookings: BookingsService,
    private readonly businesses: BusinessesService,
    private readonly config: ConfigService<Env, true>,
    private readonly account: AccountService,
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
  updateProfile(
    @CurrentCustomer() customer: Customer,
    @Body({ schema: updateProfileSchema }) body: UpdateProfileInput,
  ): Promise<CustomerView> {
    return this.customers.rename(customer, body.name)
  }

  /** 'Download my data': the account's own data as one JSON file. */
  @Get('export')
  exportData(@CurrentCustomer() customer: Customer): Promise<AccountExport> {
    return this.account.export(customer)
  }

  /** 'Delete account': what stays with the businesses and why is in `account-erasure.ts`. */
  @Delete()
  @HttpCode(200)
  async deleteAccount(
    @CurrentCustomer() customer: Customer,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccountDeleted> {
    const result = await this.account.delete(customer)
    response.clearCookie(SESSION_COOKIE, { path: '/' })
    return result
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
