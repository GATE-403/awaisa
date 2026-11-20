import type { Session } from '@awaisa/contracts'
import { Controller, Get, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CurrentCustomer, OptionalAuthGuard } from '../auth/auth.guard.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import type { Env } from '../config/env.js'
import type { Customer } from './customer.entity.js'
import { toCustomerView } from './customer-view.js'

// The browser asks who is signed in on every page; a guest's answer is a 200 with no customer,
// not the 401 of `GET /me`, which every guest's console reported as an error.
@Controller('session')
@UseGuards(OptionalAuthGuard)
export class SessionController {
  constructor(
    private readonly businesses: BusinessesService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  async getSession(@CurrentCustomer() customer: Customer | null): Promise<Session> {
    if (!customer) return { customer: null }

    return {
      customer: {
        ...toCustomerView(customer, this.config.get('ADMIN_PHONES', { infer: true })),
        ...(await this.businesses.shortcutsFor(customer)),
      },
    }
  }
}
