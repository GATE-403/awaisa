import type { AdminBooking, MasterDay, MasterPlace, MasterReviews } from '@awaisa/contracts'
import { ForbiddenException, Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { OutcomeBody } from '../admin/admin.schemas.js'
import { BookingsService } from '../bookings/bookings.service.js'
import { SalonBookingsService } from '../bookings/salon-bookings.service.js'
import type { Business } from '../businesses/business.entity.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { clampToWindow } from '../catalog/master-hours.js'
import { MasterScheduleService } from '../catalog/master-schedule.service.js'
import type { Specialist } from '../catalog/specialist.entity.js'
import { businessDateTimeToUtc } from '../common/business-time.js'
import { FollowsService } from '../follows/follows.service.js'
import { PayrollService } from '../payroll/payroll.service.js'

@Injectable()
export class MasterService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bookings: BookingsService,
    private readonly salonBookings: SalonBookingsService,
    private readonly businesses: BusinessesService,
    private readonly masterSchedule: MasterScheduleService,
    private readonly payroll: PayrollService,
    private readonly follows: FollowsService,
  ) {}

  /** Where this phone works as a master (for 'My day' entry points). */
  listPlaces(phone: string): Promise<MasterPlace[]> {
    return this.dataSource.query(
      `SELECT bz."slug", bz."name" AS "businessName", sp."id" AS "specialistId", sp."name", sp."role"
       FROM "specialists" sp JOIN "businesses" bz ON bz."id" = sp."business_id"
       WHERE sp."phone" = $1 AND sp."is_active"
       ORDER BY bz."name"`,
      [phone],
    )
  }

  /** What clients said about this master: their own reviews only, the latest twenty. */
  async getReviews(master: Specialist): Promise<MasterReviews> {
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

  async getDay(business: Business, master: Specialist, date: string): Promise<MasterDay> {
    const window = await this.businesses.getOpeningWindow(business.id, date)
    const dayStart = businessDateTimeToUtc(date, 0)
    const dayEnd = businessDateTimeToUtc(date, 24 * 60)
    const [days, leaves, bookings, pay, photos, followers] = await Promise.all([
      this.masterSchedule.daysFor([master.id], date, window),
      this.masterSchedule.leavesOn([master.id], date),
      this.salonBookings.getAdminViews(business.id, { dayStart, dayEnd }),
      // Only the master's own pay: never the others'.
      this.payroll.forMasterDay(business.id, master.id, date),
      this.photoStats(business.id, master.id, dayStart, dayEnd),
      this.follows.countFor(master.id),
    ])

    return {
      date,
      business: { slug: business.slug, name: business.name },
      master: { id: master.id, name: master.name, role: master.role },
      pay,
      hours: window ? clampToWindow(days.get(master.id) ?? null, window) : null,
      leaveReason: leaves[0] ? leaves[0].reason || 'Leave' : null,
      bookings: bookings.filter((booking) => booking.specialistId === master.id),
      photos,
      followers,
    }
  }

  /** A master marks only their own visits. */
  async setOutcome(
    businessId: string,
    master: Specialist,
    bookingId: string,
    body: OutcomeBody,
  ): Promise<AdminBooking> {
    const booking = await this.bookings.findById(bookingId)
    if (!booking || booking.specialistId !== master.id) {
      throw new ForbiddenException('This booking belongs to another specialist')
    }

    return this.salonBookings.setOutcome(businessId, bookingId, body)
  }

  /**
   * How many of the master's visits of the last seven days got a work photo (any of theirs,
   * the master's own, the cabinet's or the client's from a review), and which visits of the
   * shown day already have one.
   */
  private async photoStats(businessId: string, masterId: string, dayStart: Date, dayEnd: Date) {
    const [[week], day] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS "visits",
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM "work_photos" w WHERE w."booking_id" = b."id"))::int AS "withPhoto"
         FROM "bookings" b
         WHERE b."business_id" = $1 AND b."specialist_id" = $2 AND b."outcome" = 'arrived'
           AND b."starts_at" >= now() - interval '7 days' AND b."starts_at" <= now()`,
        [businessId, masterId],
      ) as Promise<{ visits: number; withPhoto: number }[]>,
      this.dataSource.query(
        `SELECT DISTINCT w."booking_id" AS "id" FROM "work_photos" w
         JOIN "bookings" b ON b."id" = w."booking_id"
         WHERE b."business_id" = $1 AND b."specialist_id" = $2
           AND b."starts_at" >= $3 AND b."starts_at" < $4`,
        [businessId, masterId, dayStart, dayEnd],
      ) as Promise<{ id: string }[]>,
    ])
    return {
      weekVisits: Number(week?.visits ?? 0),
      weekWithPhoto: Number(week?.withPhoto ?? 0),
      bookingIds: day.map((row) => String(row.id)),
    }
  }
}
