import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import {
  type OutcomeBody,
  outcomeSchema,
  type ScheduleQuery,
  scheduleQuerySchema,
} from '../admin/admin.schemas.js'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import { BookingsService } from '../bookings/bookings.service.js'
import type { Business } from '../businesses/business.entity.js'
import { CurrentBusiness } from '../businesses/business-access.guard.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { clampToWindow } from '../catalog/master-hours.js'
import { MasterScheduleService } from '../catalog/master-schedule.service.js'
import type { Specialist } from '../catalog/specialist.entity.js'
import { businessDateTimeToUtc } from '../common/business-time.js'
import type { Customer } from '../customers/customer.entity.js'
import { CurrentMaster, MasterGuard } from './master.guard.js'

@Controller()
export class MasterController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bookings: BookingsService,
    private readonly businesses: BusinessesService,
    private readonly masterSchedule: MasterScheduleService,
  ) {}

  /** Where the signed-in customer works as a master (for «Мой день» entry points). */
  @Get('me/master')
  @UseGuards(AuthGuard)
  listPlaces(@CurrentCustomer() customer: Customer) {
    return this.dataSource.query(
      `SELECT bz."slug", bz."name" AS "businessName", sp."id" AS "specialistId", sp."name", sp."role"
       FROM "specialists" sp JOIN "businesses" bz ON bz."id" = sp."business_id"
       WHERE sp."phone" = $1 AND sp."is_active"
       ORDER BY bz."name"`,
      [customer.phone],
    )
  }

  @Get('master/:slug/day')
  @UseGuards(MasterGuard)
  async getDay(
    @CurrentBusiness() business: Business,
    @CurrentMaster() master: Specialist,
    @Query({ schema: scheduleQuerySchema }) query: ScheduleQuery,
  ) {
    const window = await this.businesses.getOpeningWindow(business.id, query.date)
    const [days, leaves, bookings] = await Promise.all([
      this.masterSchedule.daysFor([master.id], query.date, window),
      this.masterSchedule.leavesOn([master.id], query.date),
      this.bookings.getAdminViews(business.id, {
        dayStart: businessDateTimeToUtc(query.date, 0),
        dayEnd: businessDateTimeToUtc(query.date, 24 * 60),
      }),
    ])

    return {
      date: query.date,
      business: { slug: business.slug, name: business.name },
      master: {
        id: master.id,
        name: master.name,
        role: master.role,
        commissionPercent: master.commissionPercent,
      },
      hours: window ? clampToWindow(days.get(master.id) ?? null, window) : null,
      leaveReason: leaves[0] ? leaves[0].reason || 'Отпуск' : null,
      bookings: bookings.filter((booking) => booking.specialistId === master.id),
    }
  }

  @Patch('master/:slug/bookings/:id/outcome')
  @UseGuards(MasterGuard)
  async setOutcome(
    @CurrentBusiness() business: Business,
    @CurrentMaster() master: Specialist,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: outcomeSchema }) body: OutcomeBody,
  ) {
    const booking = await this.bookings.findById(id)
    if (!booking || booking.specialistId !== master.id) {
      throw new ForbiddenException('Это запись другого мастера')
    }

    return this.bookings.setOutcome(business.id, id, body)
  }
}
