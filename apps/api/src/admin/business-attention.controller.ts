import type { BusinessAttention } from '@awaisa/contracts'
import { Controller, Get, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { BusinessAttentionService } from './business-attention.service.js'

@Controller('me/businesses')
@UseGuards(AuthGuard)
export class BusinessAttentionController {
  constructor(
    private readonly attention: BusinessAttentionService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** «Мои бизнесы»: what waits in each business (loaded after the list, never holding it up). */
  @Get('attention')
  list(@CurrentCustomer() customer: Customer): Promise<BusinessAttention[]> {
    const isPlatformAdmin = this.config
      .get('ADMIN_PHONES', { infer: true })
      .includes(customer.phone)
    return this.attention.forCustomer(customer, isPlatformAdmin)
  }
}
