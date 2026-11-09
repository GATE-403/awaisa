import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { Business } from '../businesses/business.entity.js'
import { BusinessAccessGuard, CurrentBusiness } from '../businesses/business-access.guard.js'
import {
  type CreateTimeOffInput,
  createTimeOffSchema,
  type ScheduleQuery,
  type StaffBookingInput,
  scheduleQuerySchema,
  staffBookingSchema,
} from './admin.schemas.js'
import { AdminService } from './admin.service.js'

@Controller('manage/:slug')
@UseGuards(BusinessAccessGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('schedule')
  getSchedule(
    @CurrentBusiness() business: Business,
    @Query({ schema: scheduleQuerySchema }) query: ScheduleQuery,
  ) {
    return this.admin.getSchedule(business, query.date)
  }

  @Post('bookings')
  createBooking(
    @CurrentBusiness() business: Business,
    @Body({ schema: staffBookingSchema }) body: StaffBookingInput,
  ) {
    return this.admin.createBooking(business, body)
  }

  @Post('bookings/:id/cancel')
  @HttpCode(200)
  cancelBooking(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.cancelBooking(business, id)
  }

  @Post('time-off')
  addTimeOff(
    @CurrentBusiness() business: Business,
    @Body({ schema: createTimeOffSchema }) body: CreateTimeOffInput,
  ) {
    return this.admin.addTimeOff(business, body)
  }

  @Delete('time-off/:id')
  @HttpCode(204)
  removeTimeOff(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.removeTimeOff(business, id)
  }
}
