import type { AdminBooking, MasterDay, MasterPlace, MasterReviews } from '@awaisa/contracts'
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
import { SalonBookingsService } from '../bookings/salon-bookings.service.js'
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
    private readonly salonBookings: SalonBookingsService,
    private readonly businesses: BusinessesService,
    private readonly masterSchedule: MasterScheduleService,
  ) {}

  /** Where the signed-in customer works as a master (for «Мой день» entry points). */
  @Get('me/master')
  @UseGuards(AuthGuard)
  listPlaces(@CurrentCustomer() customer: Customer): Promise<MasterPlace[]> {
    return this.dataSource.query(
      `SELECT bz."slug", bz."name" AS "businessName", sp."id" AS "specialistId", sp."name", sp."role"
       FROM "specialists" sp JOIN "businesses" bz ON bz."id" = sp."business_id"
       WHERE sp."phone" = $1 AND sp."is_active"
       ORDER BY bz."name"`,
      [customer.phone],
    )
  }

  /** What clients said about this master: their own reviews only, the latest twenty. */
  @Get('master/:slug/reviews')
  @UseGuards(MasterGuard)
  async getReviews(@CurrentMaster() master: Specialist): Promise<MasterReviews> {
    const [[totals], items] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS "count", round(avg("rating")::numeric, 1)::float AS "average"
         FROM "reviews" WHERE "specialist_id" = $1`,
        [master.id],
      ) as Promise<{ count: number; average: number | null }[]>,
      this.dataSource.query(
        `SELECT r."id", r."author_name" AS "authorName", r."rating", r."comment", r."reply",
           r."replied_at" AS "repliedAt", COALESCE(s."name", '') AS "serviceName",
           r."service_id" AS "serviceId", r."created_at" AS "createdAt"
         FROM "reviews" r LEFT JOIN "services" s ON s."id" = r."service_id"
         WHERE r."specialist_id" = $1
         ORDER BY r."created_at" DESC LIMIT 20`,
        [master.id],
      ) as Promise<
        (Omit<MasterReviews['items'][number], 'createdAt' | 'repliedAt' | 'specialistName'> & {
          createdAt: Date
          repliedAt: Date | null
        })[]
      >,
    ])

    return {
      count: totals?.count ?? 0,
      average: totals?.average ?? null,
      items: items.map((item) => ({
        ...item,
        rating: Number(item.rating),
        specialistName: master.name,
        repliedAt: item.repliedAt ? new Date(item.repliedAt).toISOString() : null,
        createdAt: new Date(item.createdAt).toISOString(),
      })),
    }
  }

  @Get('master/:slug/day')
  @UseGuards(MasterGuard)
  async getDay(
    @CurrentBusiness() business: Business,
    @CurrentMaster() master: Specialist,
    @Query({ schema: scheduleQuerySchema }) query: ScheduleQuery,
  ): Promise<MasterDay> {
    const window = await this.businesses.getOpeningWindow(business.id, query.date)
    const [days, leaves, bookings] = await Promise.all([
      this.masterSchedule.daysFor([master.id], query.date, window),
      this.masterSchedule.leavesOn([master.id], query.date),
      this.salonBookings.getAdminViews(business.id, {
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
  ): Promise<AdminBooking> {
    const booking = await this.bookings.findById(id)
    if (!booking || booking.specialistId !== master.id) {
      throw new ForbiddenException('Это запись другого мастера')
    }

    return this.salonBookings.setOutcome(business.id, id, body)
  }
}
