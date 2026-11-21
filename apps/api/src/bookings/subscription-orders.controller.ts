import type { CheckoutLink, ClientSubscription, OnlineSubscriptionPlan } from '@awaisa/contracts'
import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { Cached } from '../cache/cached.decorator.js'
import { validateEnv } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { LoyaltyService } from '../loyalty/loyalty.service.js'
import { SubscriptionOrdersService } from './subscription-orders.service.js'

const getOrderRateLimit = () => validateEnv(process.env).BOOKING_RATE_LIMIT_PER_MINUTE

@Controller()
export class SubscriptionOrdersController {
  constructor(
    private readonly orders: SubscriptionOrdersService,
    private readonly businesses: BusinessesService,
    private readonly loyalty: LoyaltyService,
  ) {}

  // The place's page: plans the owner sells online.
  @Get('businesses/:slug/subscription-plans')
  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 30 })
  listOnline(@Param('slug') slug: string): Promise<OnlineSubscriptionPlan[]> {
    return this.orders.listOnline(slug)
  }

  // «Купить»: an order on the signed-in client's number, paid on the pay page.
  @Post('businesses/:slug/subscription-plans/:id/order')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: getOrderRateLimit, ttl: 60_000 } })
  async order(
    @Param('slug') slug: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentCustomer() customer: Customer,
  ): Promise<CheckoutLink> {
    const business = await this.businesses.findBySlug(slug)
    const plan = await this.orders.findOnlinePlan(business.id, id)
    const { checkoutUrl } = await this.orders.order(plan, {
      customerId: customer.id,
      phone: customer.phone,
    })

    return { url: checkoutUrl }
  }

  // The booking form: the signed-in client's live subscriptions at this place.
  @Get('me/subscriptions/:slug')
  @UseGuards(AuthGuard)
  async mine(
    @Param('slug') slug: string,
    @CurrentCustomer() customer: Customer,
  ): Promise<ClientSubscription[]> {
    const business = await this.businesses.findBySlug(slug)

    return this.loyalty.subscriptionsAt(business.id, customer.phone)
  }
}
