import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { BookingsService } from '../bookings/bookings.service.js'
import type { Business } from '../businesses/business.entity.js'
import { BusinessAccessGuard, CurrentBusiness } from '../businesses/business-access.guard.js'
import {
  type AnalyticsQuery,
  analyticsQuerySchema,
  type CloseDayInput,
  type CreateTimeOffInput,
  closeDaySchema,
  createTimeOffSchema,
  type MoveBookingInput,
  moveBookingSchema,
  type OutcomeBody,
  outcomeSchema,
  type RecentBookingsQuery,
  type ReopenInput,
  recentBookingsQuerySchema,
  reopenSchema,
  type ScheduleQuery,
  type StaffBookingInput,
  scheduleQuerySchema,
  staffBookingSchema,
} from './admin.schemas.js'
import { AdminService } from './admin.service.js'
import { AnalyticsService } from './analytics.service.js'

@Controller('manage/:slug')
@UseGuards(BusinessAccessGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly bookings: BookingsService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post('bookings/close-day')
  @HttpCode(200)
  closeDay(
    @CurrentBusiness() business: Business,
    @Body({ schema: closeDaySchema }) body: CloseDayInput,
  ) {
    return this.admin.closeDay(business, body.date)
  }

  @Post('bookings/reopen')
  @HttpCode(204)
  async reopen(
    @CurrentBusiness() business: Business,
    @Body({ schema: reopenSchema }) body: ReopenInput,
  ) {
    await this.admin.reopen(business, body.ids)
  }

  @Get('bookings/unclosed')
  listUnclosed(@CurrentBusiness() business: Business) {
    return this.admin.listUnclosed(business)
  }

  @Patch('bookings/:id/outcome')
  setOutcome(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: outcomeSchema }) body: OutcomeBody,
  ) {
    return this.bookings.setOutcome(business.id, id, body)
  }

  @Get('analytics')
  getAnalytics(
    @CurrentBusiness() business: Business,
    @Query({ schema: analyticsQuerySchema }) query: AnalyticsQuery,
  ) {
    return this.analytics.getReport(business, query.days)
  }

  @Get('schedule')
  getSchedule(
    @CurrentBusiness() business: Business,
    @Query({ schema: scheduleQuerySchema }) query: ScheduleQuery,
  ) {
    return this.admin.getSchedule(business, query.date)
  }

  @Get('bookings/recent')
  getRecentBookings(
    @CurrentBusiness() business: Business,
    @Query({ schema: recentBookingsQuerySchema }) query: RecentBookingsQuery,
  ) {
    return this.bookings.listCreatedSince(business.id, new Date(query.since))
  }

  @Post('bookings')
  createBooking(
    @CurrentBusiness() business: Business,
    @Body({ schema: staffBookingSchema }) body: StaffBookingInput,
  ) {
    return this.admin.createBooking(business, body)
  }

  @Patch('bookings/:id')
  moveBooking(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: moveBookingSchema }) body: MoveBookingInput,
  ) {
    return this.admin.moveBooking(business, id, body)
  }

  @Post('bookings/:id/cancel')
  @HttpCode(200)
  cancelBooking(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.cancelBooking(business, id)
  }

  @Post('bookings/:id/restore')
  @HttpCode(200)
  restoreBooking(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.restoreBySalon(business.id, id)
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
