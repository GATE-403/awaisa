import type { BusinessBilling, CheckoutLink } from '@awaisa/contracts'
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CurrentCustomer } from '../auth/auth.guard.js'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type CheckoutInput,
  checkoutSchema,
  type ExtendInput,
  extendSchema,
} from './billing.schemas.js'
import { BillingOrdersService } from './billing-orders.service.js'

// «Settings → Plan»: the owner's plan, usage and paying; platform admins extend by hand.
@Controller('manage/:slug/billing')
@UseGuards(BusinessAccessGuard)
@OwnerOnly()
export class BillingController {
  constructor(
    private readonly orders: BillingOrdersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  get(@CurrentBusiness() business: Business): Promise<BusinessBilling> {
    return this.orders.overview(business)
  }

  @Post('checkout')
  @HttpCode(200)
  checkout(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer,
    @Body({ schema: checkoutSchema }) body: CheckoutInput,
  ): Promise<CheckoutLink> {
    return this.orders.checkout(business, customer, body)
  }

  @Post('extend')
  @HttpCode(200)
  extend(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer,
    @Body({ schema: extendSchema }) body: ExtendInput,
  ): Promise<BusinessBilling> {
    const isPlatformAdmin = this.config
      .get('ADMIN_PHONES', { infer: true })
      .includes(customer.phone)
    if (!isPlatformAdmin) throw new ForbiddenException('Only Awaisa can extend a plan by hand')
    return this.orders.extend(business, body)
  }
}
