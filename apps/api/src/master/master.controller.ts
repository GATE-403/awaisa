import type { AdminBooking, MasterDay, MasterPlace, MasterReviews } from '@awaisa/contracts'
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  type OutcomeBody,
  outcomeSchema,
  type ScheduleQuery,
  scheduleQuerySchema,
} from '../admin/admin.schemas.js'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import type { Business } from '../businesses/business.entity.js'
import { CurrentBusiness } from '../businesses/business-access.guard.js'
import type { Specialist } from '../catalog/specialist.entity.js'
import type { Customer } from '../customers/customer.entity.js'
import { CurrentMaster, MasterGuard } from './master.guard.js'
import { MasterService } from './master.service.js'

@Controller()
export class MasterController {
  constructor(private readonly master: MasterService) {}

  /** Where the signed-in customer works as a master (for 'My day' entry points). */
  @Get('me/master')
  @UseGuards(AuthGuard)
  listPlaces(@CurrentCustomer() customer: Customer): Promise<MasterPlace[]> {
    return this.master.listPlaces(customer.phone)
  }

  @Get('master/:slug/reviews')
  @UseGuards(MasterGuard)
  getReviews(@CurrentMaster() master: Specialist): Promise<MasterReviews> {
    return this.master.getReviews(master)
  }

  @Get('master/:slug/day')
  @UseGuards(MasterGuard)
  getDay(
    @CurrentBusiness() business: Business,
    @CurrentMaster() master: Specialist,
    @Query({ schema: scheduleQuerySchema }) query: ScheduleQuery,
  ): Promise<MasterDay> {
    return this.master.getDay(business, master, query.date)
  }

  @Patch('master/:slug/bookings/:id/outcome')
  @UseGuards(MasterGuard)
  setOutcome(
    @CurrentBusiness() business: Business,
    @CurrentMaster() master: Specialist,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: outcomeSchema }) body: OutcomeBody,
  ): Promise<AdminBooking> {
    return this.master.setOutcome(business.id, master, id, body)
  }
}
