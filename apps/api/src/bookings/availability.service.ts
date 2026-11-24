import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { TimeOff } from '../admin/time-off.entity.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { CatalogService } from '../catalog/catalog.service.js'
import { MasterScheduleService } from '../catalog/master-schedule.service.js'
import type { Service } from '../catalog/service.entity.js'
import { addDays, businessDateTimeToUtc, toBusinessParts } from '../common/business-time.js'
import { buildSlots } from './availability.js'
import { Booking } from './booking.entity.js'
import { ANY_SPECIALIST_ID, BOOKING_DAYS_AHEAD, MAX_EXTRA_SERVICES } from './booking-rules.js'
import type { AvailabilityQuery } from './bookings.schemas.js'
import { mastersForAll, noMasterMessage, visitCost, visitLength } from './visit-services.js'

/** Free time: which slots a service has on a day, and the first free time for many places at once. */
@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(TimeOff) private readonly timeOff: Repository<TimeOff>,
    private readonly catalogService: CatalogService,
    private readonly masterSchedule: MasterScheduleService,
    private readonly businesses: BusinessesService,
  ) {}

  async getAvailability({
    serviceId,
    specialistId,
    date,
    branchId,
    extraServiceIds = [],
  }: Omit<AvailabilityQuery, 'extraServiceIds'> & { extraServiceIds?: string[] }) {
    const now = new Date()
    const request = await this.resolveRequest(
      serviceId,
      specialistId,
      date,
      now,
      null,
      branchId,
      extraServiceIds,
    )
    const slots = await this.buildSlotsFor(request, date, now)

    return { date, slots: slots.map(({ time, isAvailable }) => ({ time, isAvailable })) }
  }

  /**
   * The first free time today or tomorrow for each business, for live catalog cards.
   * Uses the business's quickest service with any master - the earliest anyone could come in.
   */
  async findNextFree(slugs: string[]) {
    const rows = (await this.bookings.manager.query(
      `
      SELECT DISTINCT ON (b."slug") b."slug", s."id" AS "serviceId"
      FROM "businesses" b
      JOIN "services" s ON s."business_id" = b."id" AND s."is_active"
      WHERE b."is_published" AND b."slug" = ANY($1)
      ORDER BY b."slug", s."duration_minutes", s."price"
      `,
      [slugs],
    )) as { slug: string; serviceId: string }[]
    const times = await this.firstFreeTimes(rows.map(({ serviceId }) => ({ serviceId })))

    return Object.fromEntries(rows.map(({ slug }, index) => [slug, times[index] ?? null]))
  }

  /**
   * Each active service of a place with its first free time (any master) today or tomorrow, so
   * the booking form's list can say «Сегодня с 15:30» before a service is picked.
   */
  async findNextFreeByService(slug: string, branchId?: string) {
    const rows = (await this.bookings.manager.query(
      `SELECT s."id" FROM "services" s
       JOIN "businesses" b ON b."id" = s."business_id" AND b."is_published" AND b."slug" = $1
       WHERE s."is_active" LIMIT 60`,
      [slug],
    )) as { id: string }[]
    const times = await this.firstFreeTimes(rows.map(({ id }) => ({ serviceId: id, branchId })))

    return Object.fromEntries(rows.map(({ id }, index) => [id, times[index] ?? null]))
  }

  /**
   * What a booking asks for: its services (the first, then the ones done after it in the same
   * visit), their length and price added up, and the masters who do every one of them.
   */
  async resolveRequest(
    serviceId: string,
    specialistId: string,
    date: string,
    now: Date,
    staffBusinessId: string | null = null,
    branchId?: string,
    extraServiceIds: string[] = [],
  ) {
    const today = toBusinessParts(now).dateKey
    if (date < today || date > addDays(today, BOOKING_DAYS_AHEAD - 1)) {
      throw new BadRequestException(`Запись доступна на ${BOOKING_DAYS_AHEAD} дней вперёд`)
    }

    const service = await this.catalogService.getActiveService(serviceId)
    if (staffBusinessId !== null && service.businessId !== staffBusinessId) {
      throw new NotFoundException('Услуга не найдена')
    }
    const extras = await this.resolveExtras(service, extraServiceIds)
    const services = [service, ...extras]
    const business = await this.businesses.findById(service.businessId)
    // Staff can book clients in before the page is published.
    if (!business.isPublished && staffBusinessId === null) {
      throw new BadRequestException('Запись временно недоступна')
    }
    const offerings = await this.catalogService.getSpecialistsForServices(
      services.map((item) => item.id),
    )
    const offering = mastersForAll(services.map((item) => offerings.get(item.id) ?? []))
    const inBranch = offering.filter(
      (specialist) => !branchId || specialist.branchId === null || specialist.branchId === branchId,
    )
    const specialistIds = (
      specialistId === ANY_SPECIALIST_ID
        ? inBranch
        : offering.filter((specialist) => specialist.id === specialistId)
    ).map((specialist) => specialist.id)
    if (specialistIds.length === 0) {
      throw new BadRequestException(noMasterMessage(specialistId, extras.length > 0))
    }
    const branchOf = (id: string) =>
      offering.find((specialist) => specialist.id === id)?.branchId ?? null

    return {
      service,
      services,
      durationMinutes: visitLength(services),
      price: visitCost(services),
      specialistIds,
      branchOf,
      slotMinutes: business.slotMinutes,
    }
  }

  /** The services done after the first in one visit: active, of the same place, each once. */
  private async resolveExtras(service: Service, extraServiceIds: string[]) {
    if (extraServiceIds.length === 0) return []
    const ids = [...new Set(extraServiceIds)]
    if (ids.length !== extraServiceIds.length || ids.includes(service.id)) {
      throw new BadRequestException('Каждую услугу можно выбрать один раз')
    }
    if (ids.length > MAX_EXTRA_SERVICES) {
      throw new BadRequestException(`За один визит можно до ${MAX_EXTRA_SERVICES + 1} услуг`)
    }
    const found = await this.catalogService.getActiveServices(ids)
    const byId = new Map(found.map((item) => [item.id, item]))
    return ids.map((id) => {
      const extra = byId.get(id)
      if (!extra || extra.businessId !== service.businessId) {
        throw new NotFoundException('Услуга не найдена')
      }
      return extra
    })
  }

  /**
   * The first free time today or tomorrow, with any master, for each request - the same answer
   * as `getAvailability` day by day, but with a fixed number of queries however many requests
   * there are (it used to be about eight per place per day: catalog cards and «Для вас» ask for
   * dozens of places at once). A service without masters, or of an unpublished place, gets null.
   */
  private async firstFreeTimes(requests: { serviceId: string; branchId?: string }[]) {
    const none = requests.map(() => null)
    if (requests.length === 0) return none
    const now = new Date()
    const today = toBusinessParts(now).dateKey
    const dates = [today, addDays(today, 1)]

    const services = await this.catalogService.getActiveServices([
      ...new Set(requests.map((request) => request.serviceId)),
    ])
    const serviceById = new Map(services.map((service) => [service.id, service]))
    const [businesses, offerings] = await Promise.all([
      this.businesses.findByIds([...new Set(services.map((service) => service.businessId))]),
      this.catalogService.getSpecialistsForServices(services.map((service) => service.id)),
    ])
    const businessById = new Map(businesses.map((business) => [business.id, business]))
    const plans = requests.map(({ serviceId, branchId }) => {
      const service = serviceById.get(serviceId)
      const business = service && businessById.get(service.businessId)
      if (!service || !business?.isPublished) return null
      const specialistIds = (offerings.get(service.id) ?? [])
        .filter(
          (specialist) =>
            !branchId || specialist.branchId === null || specialist.branchId === branchId,
        )
        .map((specialist) => specialist.id)

      return specialistIds.length > 0 ? { service, business, specialistIds } : null
    })
    const specialistIds = [...new Set(plans.flatMap((plan) => plan?.specialistIds ?? []))]
    if (specialistIds.length === 0) return none

    const businessOf = new Map(
      [...offerings.values()].flat().map((specialist) => [specialist.id, specialist.businessId]),
    )
    const windows = await this.businesses.getOpeningWindows(
      [...new Set(plans.flatMap((plan) => (plan ? [plan.business.id] : [])))],
      dates,
    )
    const rangeStart = businessDateTimeToUtc(today, 0)
    const rangeEnd = businessDateTimeToUtc(dates[1] ?? today, 24 * 60)
    const [busy, blocked, offHours] = await Promise.all([
      this.bookings
        .createQueryBuilder('booking')
        .select(['booking.specialistId', 'booking.startsAt', 'booking.endsAt'])
        .where({ specialistId: In(specialistIds), status: 'confirmed' })
        .andWhere('booking.startsAt < :rangeEnd AND booking.endsAt > :rangeStart', {
          rangeStart,
          rangeEnd,
        })
        .getMany(),
      this.timeOff
        .createQueryBuilder('timeOff')
        .select(['timeOff.specialistId', 'timeOff.startsAt', 'timeOff.endsAt'])
        .where({ specialistId: In(specialistIds) })
        .andWhere('timeOff.startsAt < :rangeEnd AND timeOff.endsAt > :rangeStart', {
          rangeStart,
          rangeEnd,
        })
        .getMany(),
      this.masterSchedule.offHoursBusyMany(
        specialistIds,
        dates,
        (id, date) => windows.get(`${businessOf.get(id)}:${date}`) ?? null,
      ),
    ])
    const intervals = [...busy, ...blocked, ...offHours]

    return plans.map((plan) => {
      if (!plan) return null
      const ids = new Set(plan.specialistIds)
      for (const date of dates) {
        const dayStart = businessDateTimeToUtc(date, 0)
        const dayEnd = businessDateTimeToUtc(date, 24 * 60)
        const free = buildSlots({
          dateKey: date,
          window: windows.get(`${plan.business.id}:${date}`) ?? null,
          slotMinutes: plan.business.slotMinutes,
          now,
          durationMinutes: plan.service.durationMinutes,
          specialistIds: plan.specialistIds,
          busy: intervals.filter(
            (interval) =>
              ids.has(interval.specialistId) &&
              interval.startsAt < dayEnd &&
              interval.endsAt > dayStart,
          ),
        }).filter((slot) => slot.isAvailable)
        // The first two: a place card offers them as capsules that open the form on that time.
        const first = free[0]
        if (first)
          return { date, time: first.time, times: free.slice(0, 2).map((slot) => slot.time) }
      }

      return null
    })
  }

  async buildSlotsFor(
    {
      service,
      durationMinutes,
      specialistIds,
      slotMinutes,
    }: { service: Service; durationMinutes: number; specialistIds: string[]; slotMinutes: number },
    date: string,
    now: Date,
    /** A booking being moved does not block its own new time. */
    excludeBookingId?: string,
  ) {
    const dayStart = businessDateTimeToUtc(date, 0)
    const dayEnd = businessDateTimeToUtc(date, 24 * 60)
    const busy = await this.bookings
      .createQueryBuilder('booking')
      .select(['booking.specialistId', 'booking.startsAt', 'booking.endsAt'])
      .where({ specialistId: In(specialistIds), status: 'confirmed' })
      .andWhere('booking.startsAt < :dayEnd AND booking.endsAt > :dayStart', { dayStart, dayEnd })
      .andWhere(excludeBookingId ? 'booking.id != :excludeBookingId' : '1=1', { excludeBookingId })
      .getMany()
    const blocked = await this.timeOff
      .createQueryBuilder('timeOff')
      .select(['timeOff.specialistId', 'timeOff.startsAt', 'timeOff.endsAt'])
      .where({ specialistId: In(specialistIds) })
      .andWhere('timeOff.startsAt < :dayEnd AND timeOff.endsAt > :dayStart', { dayStart, dayEnd })
      .getMany()

    const window = await this.businesses.getOpeningWindow(service.businessId, date)
    const offHours = await this.masterSchedule.offHoursBusy(specialistIds, date, window)

    return buildSlots({
      dateKey: date,
      window,
      slotMinutes,
      now,
      durationMinutes,
      specialistIds,
      busy: [...busy, ...blocked, ...offHours],
    })
  }
}
