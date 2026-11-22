import type { FollowedMaster } from '@awaisa/contracts'
import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import type { Customer } from '../customers/customer.entity.js'
import { type FollowInput, followSchema } from './follows.schemas.js'
import { FollowsService } from './follows.service.js'

@Controller('me/follows')
@UseGuards(AuthGuard)
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Get()
  list(@CurrentCustomer() customer: Customer): Promise<FollowedMaster[]> {
    return this.follows.list(customer.id)
  }

  @Put(':specialistId')
  follow(
    @CurrentCustomer() customer: Customer,
    @Param('specialistId') specialistId: string,
    @Body({ schema: followSchema }) body: FollowInput,
  ): Promise<FollowedMaster[]> {
    return this.follows.follow(customer.id, specialistId, body.notifyWorks)
  }

  @Delete(':specialistId')
  unfollow(
    @CurrentCustomer() customer: Customer,
    @Param('specialistId') specialistId: string,
  ): Promise<FollowedMaster[]> {
    return this.follows.unfollow(customer.id, specialistId)
  }
}
