import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common'
import type { Business } from '../businesses/business.entity.js'
import { BusinessAccessGuard, CurrentBusiness } from '../businesses/business-access.guard.js'
import { WaitlistService } from './waitlist.service.js'

// The cabinet sees who waits for a full day, with phones, and can book them in or drop them.
@Controller('manage/:slug/waitlist')
@UseGuards(BusinessAccessGuard)
export class ManageWaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Get()
  list(@CurrentBusiness() business: Business) {
    return this.waitlist.listForBusiness(business.id)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.waitlist.removeForBusiness(business.id, id)
  }
}
