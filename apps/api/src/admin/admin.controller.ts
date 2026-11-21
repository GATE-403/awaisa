import type {
  AdminBooking,
  AdminSchedule,
  AnalyticsGoal,
  AnalyticsReport,
  Booking,
  ClosedDay,
  CreatedTimeOff,
  MovedBooking,
  PageStats,
  RecentBooking,
  ScheduleLoad,
  UnclosedDays,
} from '@awaisa/contracts'
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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { SalonBookingsService } from '../bookings/salon-bookings.service.js'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import {
  type AnalyticsGoalInput,
  type AnalyticsQuery,
  analyticsGoalSchema,
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
  type ScheduleLoadQuery,
  type ScheduleQuery,
  type StaffBookingInput,
  scheduleLoadQuerySchema,
  scheduleQuerySchema,
  staffBookingSchema,
} from './admin.schemas.js'
import { AdminService } from './admin.service.js'
import { AnalyticsService } from './analytics.service.js'

/** «За неделю» on the owner's page. */
const PAGE_STATS_DAYS = 7

@Controller('manage/:slug')
@UseGuards(BusinessAccessGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly salonBookings: SalonBookingsService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post('bookings/close-day')
  @HttpCode(200)
  closeDay(
    @CurrentBusiness() business: Business,
    @Body({ schema: closeDaySchema }) body: CloseDayInput,
  ): Promise<ClosedDay> {
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
  listUnclosed(@CurrentBusiness() business: Business): Promise<UnclosedDays> {
    return this.admin.listUnclosed(business)
  }

  @Patch('bookings/:id/outcome')
  setOutcome(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: outcomeSchema }) body: OutcomeBody,
  ): Promise<AdminBooking> {
    return this.salonBookings.setOutcome(business.id, id, body)
  }

  @OwnerOnly()
  @Get('analytics')
  getAnalytics(
    @CurrentBusiness() business: Business,
    @Query({ schema: analyticsQuerySchema }) query: AnalyticsQuery,
  ): Promise<AnalyticsReport> {
    return this.analytics.getReport(business, query.days)
  }

  @OwnerOnly()
  @Get('page-stats')
  getPageStats(@CurrentBusiness() business: Business): Promise<PageStats> {
    return this.analytics.pageStats(business, PAGE_STATS_DAYS)
  }

  @OwnerOnly()
  @Put('analytics/goal')
  setAnalyticsGoal(
    @CurrentBusiness() business: Business,
    @Body({ schema: analyticsGoalSchema }) body: AnalyticsGoalInput,
  ): Promise<AnalyticsGoal> {
    return this.analytics.setGoal(business, body.goal)
  }

  @Get('schedule')
  getSchedule(
    @CurrentBusiness() business: Business,
    @Query({ schema: scheduleQuerySchema }) query: ScheduleQuery,
  ): Promise<AdminSchedule> {
    return this.admin.getSchedule(business, query.date)
  }

  @Get('schedule/load')
  getScheduleLoad(
    @CurrentBusiness() business: Business,
    @Query({ schema: scheduleLoadQuerySchema }) query: ScheduleLoadQuery,
  ): Promise<ScheduleLoad> {
    return this.admin.getLoad(business, query.from, query.days)
  }

  @Get('bookings/recent')
  getRecentBookings(
    @CurrentBusiness() business: Business,
    @Query({ schema: recentBookingsQuerySchema }) query: RecentBookingsQuery,
  ): Promise<RecentBooking[]> {
    return this.salonBookings.listCreatedSince(business.id, new Date(query.since))
  }

  @Post('bookings')
  createBooking(
    @CurrentBusiness() business: Business,
    @Body({ schema: staffBookingSchema }) body: StaffBookingInput,
  ): Promise<AdminBooking> {
    return this.admin.createBooking(business, body)
  }

  @Patch('bookings/:id')
  moveBooking(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: moveBookingSchema }) body: MoveBookingInput,
  ): Promise<MovedBooking> {
    return this.admin.moveBooking(business, id, body)
  }

  @Post('bookings/:id/cancel')
  @HttpCode(200)
  cancelBooking(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Booking> {
    return this.admin.cancelBooking(business, id)
  }

  @Post('bookings/:id/restore')
  @HttpCode(200)
  restoreBooking(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Booking> {
    return this.salonBookings.restoreBySalon(business.id, id)
  }

  @Post('time-off')
  addTimeOff(
    @CurrentBusiness() business: Business,
    @Body({ schema: createTimeOffSchema }) body: CreateTimeOffInput,
  ): Promise<CreatedTimeOff> {
    return this.admin.addTimeOff(business, body)
  }

  @Delete('time-off/:id')
  @HttpCode(204)
  removeTimeOff(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.removeTimeOff(business, id)
  }
}
