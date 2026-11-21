import type { PushConfig } from '@awaisa/contracts'
import { Body, Controller, Delete, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type SubscribeInput,
  subscribeSchema,
  type UnsubscribeInput,
  unsubscribeSchema,
} from './push.schemas.js'
import { PushService } from './push.service.js'

@Controller()
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('push/config')
  config(): PushConfig {
    return this.push.config
  }

  @Post('me/push-subscriptions')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async subscribe(
    @CurrentCustomer() customer: Customer,
    @Body({ schema: subscribeSchema }) body: SubscribeInput,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    await this.push.subscribe(customer.id, body, userAgent ?? '')
  }

  @Delete('me/push-subscriptions')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async unsubscribe(
    @CurrentCustomer() customer: Customer,
    @Body({ schema: unsubscribeSchema }) body: UnsubscribeInput,
  ) {
    await this.push.unsubscribe(customer.id, body.endpoint)
  }
}
