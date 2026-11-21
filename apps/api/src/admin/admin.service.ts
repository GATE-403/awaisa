import type { ScheduleLoad } from '@awaisa/contracts'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { UNDO_WINDOW_SECONDS } from '../bookings/booking-rules.js'
import { BookingsService } from '../bookings/bookings.service.js'
import { SalonBookingsService } from '../bookings/salon-bookings.service.js'
import { visitPrice } from '../bookings/visit-sql.js'
import type { Business } from '../businesses/business.entity.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { CatalogService } from '../catalog/catalog.service.js'
import { clampToWindow } from '../catalog/master-hours.js'
import { MasterScheduleService } from '../catalog/master-schedule.service.js'
import {
  businessDateTimeToUtc,
  formatMinutes,
  parseTime,
  toBusinessParts,
} from '../common/business-time.js'
import type { Env } from '../config/env.js'
import { FiscalService } from '../fiscal/fiscal.service.js'
import { InventoryService } from '../inventory/inventory.service.js'
import { LoyaltyService } from '../loyalty/loyalty.service.js'
import { ClientMessagesService } from '../notifications/client-messages.service.js'
import { rescheduleMessage, salonCancellationMessage } from '../notifications/messages.js'
import {
  whatsappReschedule,
  whatsappSalonCancellation,
} from '../notifications/whatsapp-messages.js'
import type { CreateTimeOffInput, MoveBookingInput, StaffBookingInput } from './admin.schemas.js'
import { TimeOff } from './time-off.entity.js'

const toTimeOffView = (timeOff: TimeOff) => {
  const start = toBusinessParts(timeOff.startsAt)
  const end = toBusinessParts(timeOff.endsAt)

  return {
    id: timeOff.id,
    specialistId: timeOff.specialistId,
    date: start.dateKey,
    from: formatMinutes(start.minutes),
    to: end.dateKey === start.dateKey ? formatMinutes(end.minutes) : '24:00',
    reason: timeOff.reason,
  }
}

const dayBounds = (date: string) => ({
  dayStart: businessDateTimeToUtc(date, 0),
  dayEnd: businessDateTimeToUtc(date, 24 * 60),
})

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(TimeOff) private readonly timeOff: Repository<TimeOff>,
    private readonly bookings: BookingsService,
    private readonly salonBookings: SalonBookingsService,
    private readonly catalog: CatalogService,
    private readonly masterSchedule: MasterScheduleService,
    private readonly businesses: BusinessesService,
    private readonly clientMessages: ClientMessagesService,
    private readonly config: ConfigService<Env, true>,
    private readonly loyalty: LoyaltyService,
    private readonly inventory: InventoryService,
    private readonly fiscal: FiscalService,
  ) {}

  async getSchedule(business: Business, date: string) {
    const bounds = dayBounds(date)
    const specialists = await this.catalog.listActiveSpecialists(business.id)
    const [bookings, timeOff] = await Promise.all([
      this.salonBookings.getAdminViews(business.id, bounds),
      specialists.length === 0
        ? []
        : this.timeOff
            .createQueryBuilder('timeOff')
            .where({ specialistId: In(specialists.map(({ id }) => id)) })
            .andWhere('timeOff.startsAt < :dayEnd AND timeOff.endsAt > :dayStart', bounds)
            .orderBy('timeOff.startsAt', 'ASC')
            .getMany(),
    ])

    const window = await this.businesses.getOpeningWindow(business.id, date)
    const ids = specialists.map(({ id }) => id)
    const [days, leaves] = await Promise.all([
      this.masterSchedule.daysFor(ids, date, window),
      this.masterSchedule.leavesOn(ids, date),
    ])

    return {
      date,
      specialists: specialists.map(({ id, name, role, branchId, photoUrl }) => {
        const day = window ? clampToWindow(days.get(id) ?? null, window) : null
        return {
          id,
          name,
          role,
          branchId,
          photoUrl,
          // The master's own day inside the business hours; null = not working.
          hours: day,
          leaveReason: leaves.find((leave) => leave.specialistId === id)?.reason ?? null,
          isOnLeave: leaves.some((leave) => leave.specialistId === id),
        }
      }),
      bookings,
      timeOff: timeOff.map(toTimeOffView),
    }
  }

  // Visits that have ended without «пришёл / не пришёл» in the last 30 days, per day: without
  // them the money in analytics is a guess.
  async listUnclosed(business: Business) {
    const rows = (await this.timeOff.manager.query(
      `SELECT to_char(("starts_at" AT TIME ZONE 'UTC' + interval '6 hours')::date, 'YYYY-MM-DD') AS "date",
         COUNT(*)::int AS "count"
       FROM "bookings"
       WHERE "business_id" = $1 AND "status" = 'confirmed' AND "outcome" IS NULL
         AND "ends_at" < now() AND "starts_at" > now() - interval '30 days'
       GROUP BY 1 ORDER BY 1`,
      [business.id],
    )) as { date: string; count: number }[]

    return { total: rows.reduce((sum, row) => sum + row.count, 0), days: rows }
  }

  // How full each day of a stretch is, for the day strip: booked minutes of confirmed visits
  // against the open minutes of the business hours times its active masters (masters' own hours
  // and leaves are left out — the strip shows a share, not a promise).
  async getLoad(business: Business, from: string, days: number) {
    return (await this.timeOff.manager.query(
      `WITH "days" AS (
         SELECT d::date AS "day" FROM generate_series($2::date, $2::date + ($3::int - 1), interval '1 day') AS d
       ), "booked" AS (
         SELECT ("starts_at" AT TIME ZONE 'UTC' + interval '6 hours')::date AS "day",
           SUM(EXTRACT(EPOCH FROM ("ends_at" - "starts_at")) / 60)::int AS "minutes"
         FROM "bookings"
         WHERE "business_id" = $1 AND "status" = 'confirmed'
           AND "starts_at" >= ($2::date - interval '6 hours') AT TIME ZONE 'UTC'
           AND "starts_at" < ($2::date + $3::int - interval '6 hours') AT TIME ZONE 'UTC'
         GROUP BY 1
       ), "masters" AS (
         SELECT COUNT(*)::int AS "count" FROM "specialists" WHERE "business_id" = $1 AND "is_active"
       )
       SELECT to_char("days"."day", 'YYYY-MM-DD') AS "date",
         COALESCE("booked"."minutes", 0)::int AS "minutes",
         COALESCE((wh."closes_minutes" - wh."opens_minutes") * "masters"."count", 0)::int AS "capacity"
       FROM "days" CROSS JOIN "masters"
       LEFT JOIN "booked" ON "booked"."day" = "days"."day"
       LEFT JOIN "working_hours" AS wh
         ON wh."business_id" = $1 AND wh."weekday" = EXTRACT(ISODOW FROM "days"."day")::int - 1
       ORDER BY 1`,
      [business.id, from, days],
    )) as ScheduleLoad
  }

  // «Все пришли»: every ended visit of the day without an outcome counts as arrived, paid the
  // price in cash. The ids come back so the toast can undo exactly these.
  async closeDay(business: Business, date: string) {
    const rows = (await this.timeOff.manager.query(
      `UPDATE "bookings" AS b SET "outcome" = 'arrived', "paid_amount" = ${visitPrice()} - COALESCE(b."discount_amount", 0),
         "payment_method" = 'cash', "outcome_at" = now()
       FROM "services" AS s
       WHERE s."id" = b."service_id" AND b."business_id" = $1 AND b."status" = 'confirmed'
         AND b."outcome" IS NULL AND b."ends_at" < now()
         AND b."starts_at" >= $2 AND b."starts_at" < $3
       RETURNING b."id"`,
      [business.id, ...Object.values(dayBounds(date))],
    )) as unknown
    const list = (Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows) as {
      id: string
    }[]

    const ids = list.map((row) => row.id)
    await this.loyalty.usePlannedSubscriptions(ids)
    await this.loyalty.earnForVisits(ids)
    await this.inventory.useForVisits(ids)
    await this.fiscal.syncVisits(business.id, ids)

    return { ids }
  }

  async reopen(business: Business, ids: string[]) {
    await this.timeOff.manager.query(
      `UPDATE "bookings" SET "outcome" = NULL, "paid_amount" = NULL, "payment_method" = NULL,
         "outcome_at" = NULL
       WHERE "business_id" = $1 AND "id" = ANY($2::uuid[])`,
      [business.id, ids],
    )
    await this.loyalty.revertVisits(ids)
    await this.inventory.revertVisits(ids)
    await this.fiscal.syncVisits(business.id, ids)
  }

  async createBooking(business: Business, input: StaffBookingInput) {
    // The client's cancel token is for their own device; staff cancel from the schedule.
    const { cancelToken: _cancelToken, ...view } = await this.bookings.create(
      input,
      null,
      business.id,
    )

    return view
  }

  async moveBooking(business: Business, id: string, input: MoveBookingInput) {
    const { view, previous, customerPhone } = await this.salonBookings.moveBySalon(
      business.id,
      id,
      input,
    )
    const movedTo = (await this.salonBookings.getStartsAt(id))?.getTime()
    // Like cancelling, the text waits for the undo window: a drag that is put back says nothing.
    setTimeout(async () => {
      if ((await this.salonBookings.getStartsAt(id))?.getTime() !== movedTo) return
      if (await this.bookings.isCancelled(id)) return
      void this.clientMessages.send(customerPhone, {
        text: rescheduleMessage(view, this.bookings.linkTo(view.id)),
        link: this.bookings.manageButton(view.id),
        whatsapp: whatsappReschedule(view, this.bookings.linkTo(view.id)),
        billing: { businessId: business.id, isOptional: false },
      })
    }, UNDO_WINDOW_SECONDS * 1000).unref()

    return { ...view, previous }
  }

  async cancelBooking(business: Business, id: string) {
    const { view, customerPhone, wasConfirmed } = await this.salonBookings.cancelBySalon(
      business.id,
      id,
    )
    if (wasConfirmed) {
      // The text waits out the undo window, so a mis-tap that is undone never reaches the client.
      setTimeout(async () => {
        if (!(await this.bookings.isCancelled(id))) return
        const webUrl = this.config.get('PUBLIC_WEB_URL', { infer: true })
        void this.clientMessages.send(customerPhone, {
          text: salonCancellationMessage(view, webUrl),
          whatsapp: whatsappSalonCancellation(view, webUrl),
          billing: { businessId: business.id, isOptional: false },
        })
      }, UNDO_WINDOW_SECONDS * 1000).unref()
    }

    return view
  }

  async addTimeOff(business: Business, input: CreateTimeOffInput) {
    if (!(await this.catalog.specialistBelongsTo(input.specialistId, business.id))) {
      throw new BadRequestException('Мастер не найден')
    }

    const startsAt = businessDateTimeToUtc(input.date, parseTime(input.from))
    const endsAt = businessDateTimeToUtc(input.date, parseTime(input.to))
    const saved = await this.timeOff.save(
      this.timeOff.create({
        specialistId: input.specialistId,
        startsAt,
        endsAt,
        reason: input.reason,
      }),
    )
    const conflicts = (
      await this.salonBookings.getAdminViews(business.id, { dayStart: startsAt, dayEnd: endsAt })
    ).filter(
      (booking) => booking.status === 'confirmed' && booking.specialistId === input.specialistId,
    )

    return { timeOff: toTimeOffView(saved), conflictingBookingIds: conflicts.map(({ id }) => id) }
  }

  async removeTimeOff(business: Business, id: string) {
    const timeOff = await this.timeOff.findOneBy({ id })
    if (!timeOff || !(await this.catalog.specialistBelongsTo(timeOff.specialistId, business.id))) {
      throw new NotFoundException('Перерыв не найден')
    }
    await this.timeOff.delete({ id })
  }
}
