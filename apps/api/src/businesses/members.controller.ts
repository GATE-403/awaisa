import type { TeamMember } from '@awaisa/contracts'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { z } from 'zod'
import { CurrentCustomer } from '../auth/auth.guard.js'
import { RequiresFeature } from '../billing/plan.guard.js'
import type { Customer } from '../customers/customer.entity.js'
import type { Business } from './business.entity.js'
import { BusinessAccessGuard, CurrentBusiness, OwnerOnly } from './business-access.guard.js'
import { MembersService } from './members.service.js'

const addMemberSchema = z.object({ phone: z.string().trim().min(5).max(32) })

type AddMemberInput = z.infer<typeof addMemberSchema>

@Controller('manage/:slug/members')
@UseGuards(BusinessAccessGuard)
@OwnerOnly()
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(@CurrentBusiness() business: Business): Promise<TeamMember[]> {
    return this.members.list(business.id)
  }

  @RequiresFeature('team')
  @Post()
  add(
    @CurrentBusiness() business: Business,
    @Body({ schema: addMemberSchema }) body: AddMemberInput,
  ): Promise<TeamMember[]> {
    return this.members.add(business, body.phone)
  }

  @Delete(':customerId')
  @HttpCode(204)
  remove(
    @CurrentBusiness() business: Business,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentCustomer() me: Customer,
  ): Promise<void> {
    return this.members.remove(business.id, customerId, me.id)
  }
}
