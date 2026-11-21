import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TimeOff } from '../admin/time-off.entity.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { CatalogService } from '../catalog/catalog.service.js'
import { MasterScheduleService } from '../catalog/master-schedule.service.js'
import {
  addDays,
  businessDateTimeToUtc,
  formatMinutes,
  parseTime,
  toBusinessParts,
} from '../common/business-time.js'
import { FiscalService } from '../fiscal/fiscal.service.js'
import { InventoryService } from '../inventory/inventory.service.js'
import { LoyaltyService } from '../loyalty/loyalty.service.js'
import { Booking } from './booking.entity.js'
import {
  type AdminBookingView,
  bookingViewQuery,
  isOverlapError,
  toAdminView,
  toView,
  visitServices,
} from './booking-shared.js'
import { BookingsService } from './bookings.service.js'
import { mastersForAll, visitCost } from './visit-services.js'

const MAX_RECENT_BOOKINGS = 20

type OutcomeInput = {
  outcome: 'arrived' | 'no_show' | null
  paidAmount?: number | null
  paymentMethod?: Booking['paymentMethod']
  subscriptionId?: string | null
  certificateCode?: string | null
  certificateAmount?: number | null
  bonusAmount?: number | null
}

/** What the salon does with its bookings: the day's views, moves, cancellations and visit outcomes. */
@Injectable()
export class SalonBookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(TimeOff) private readonly timeOff: Repository<TimeOff>,
    private readonly bookingsService: BookingsService,
    private readonly catalogService: CatalogService,
    private readonly masterSchedule: MasterScheduleService,
    private readonly businesses: BusinessesService,
    private readonly loyalty: LoyaltyService,
    private readonly inventory: InventoryService,
    private readonly fiscal: FiscalService,
  ) {}

  async restoreBySalon(businessId: string, id: string) {
    const booking = await this.bookings.findOneBy({ id, businessId })
    if (!booking) throw new NotFoundException('Запись не найдена')

    return this.bookingsService.restore(booking)
  }

  async getAdminViews(
    businessId: string,
    where: { dayStart: Date; dayEnd: Date },
  ): Promise<AdminBookingView[]> {
    const bookings = await bookingViewQuery(this.bookings)
      .where('booking.businessId = :businessId', { businessId })
      .andWhere('booking.startsAt < :dayEnd AND booking.endsAt > :dayStart', where)
      .orderBy('booking.startsAt', 'ASC')
      .getMany()

    return bookings.map(toAdminView)
  }

  // Marked by staff once the time has come: arrived (with what was paid) or did not show up.
  async setOutcome(businessId: string, id: string, input: OutcomeInput) {
    const booking = await bookingViewQuery(this.bookings)
      .where('booking.id = :id AND booking.businessId = :businessId', { id, businessId })
      .getOne()
    if (!booking) throw new NotFoundException('Запись не найдена')
    if (booking.status !== 'confirmed') throw new BadRequestException('Запись отменена')
    const todayEnd = businessDateTimeToUtc(addDays(toBusinessParts(new Date()).dateKey, 1), 0)
    if (input.outcome && booking.startsAt >= todayEnd) {
      throw new BadRequestException('Отметить визит можно в его день или позже')
    }
    const isArrived = input.outcome === 'arrived'
    const services = visitServices(booking)
    const due = visitCost(services) - (booking.discountAmount ?? 0)
    // Subscriptions, certificates and bonuses pay part or all of it; money pays the rest.
    let covered = 0
    let coveredBy: 'subscription' | 'certificate' | null = null
    if (isArrived) {
      const settled = await this.loyalty.applyToVisit(
        {
          id,
          businessId,
          phone: booking.customerPhone,
          serviceId: booking.serviceId,
          lines: services.map((service) => ({ serviceId: service.id, price: service.price })),
          due,
        },
        input,
      )
      covered = settled.covered
      coveredBy = settled.method
    } else {
      await this.loyalty.revertVisits([id])
      await this.inventory.revertVisits([id])
    }
    const paidAmount = isArrived ? (input.paidAmount ?? Math.max(due - covered, 0)) : null
    await this.bookings.update(
      { id },
      {
        outcome: input.outcome,
        paidAmount,
        paymentMethod: isArrived
          ? paidAmount === 0 && coveredBy
            ? coveredBy
            : input.paymentMethod &&
                input.paymentMethod !== 'subscription' &&
                input.paymentMethod !== 'certificate'
              ? input.paymentMethod
              : 'cash'
          : null,
        outcomeAt: input.outcome ? new Date() : null,
      },
    )
    if (isArrived) {
      await this.loyalty.earnForVisits([id])
      await this.inventory.useForVisits([id])
    }
    // Money taken at the visit gets its receipt (or the old one refunded); never fails the save.
    await this.fiscal.syncVisits(businessId, [id])

    return toAdminView(
      await bookingViewQuery(this.bookings).where('booking.id = :id', { id }).getOneOrFail(),
    )
  }

  /** Bookings clients made after `since`, for the cabinet's new-booking alerts. */
  async listCreatedSince(businessId: string, since: Date) {
    const bookings = await bookingViewQuery(this.bookings)
      .where('booking.businessId = :businessId', { businessId })
      .andWhere('booking.createdAt > :since', { since })
      .andWhere("booking.status = 'confirmed'")
      .orderBy('booking.createdAt', 'ASC')
      .take(MAX_RECENT_BOOKINGS)
      .getMany()

    return bookings.map((booking) => ({
      ...toView(booking),
      customerPhone: booking.customerPhone,
      comment: booking.comment,
      createdAt: booking.createdAt.toISOString(),
    }))
  }

  /** Staff drag a booking to another time or master. Hours are not enforced: staff may stay late. */
  async moveBySalon(
    businessId: string,
    id: string,
    target: { date: string; time: string; specialistId: string },
  ) {
    const booking = await this.bookings.findOne({
      where: { id, businessId },
      relations: { service: true },
    })
    if (!booking) throw new NotFoundException('Запись не найдена')
    if (booking.status !== 'confirmed') throw new BadRequestException('Запись отменена')

    const serviceIds = [
      booking.serviceId,
      ...(await this.bookingsService.extraServiceIdsOf(booking.id)),
    ]
    const offerings = await this.catalogService.getSpecialistsForServices(serviceIds)
    const offering = mastersForAll(serviceIds.map((serviceId) => offerings.get(serviceId) ?? []))
    if (!offering.some((specialist) => specialist.id === target.specialistId)) {
      throw new BadRequestException(
        serviceIds.length > 1
          ? 'Этот мастер не делает все услуги визита'
          : 'Этот мастер не выполняет эту услугу',
      )
    }
    const startsAt = businessDateTimeToUtc(target.date, parseTime(target.time))
    // The visit keeps its length: every service of it one after another.
    const endsAt = new Date(
      startsAt.getTime() + (booking.endsAt.getTime() - booking.startsAt.getTime()),
    )
    if (startsAt.getTime() < Date.now()) throw new BadRequestException('Нельзя перенести в прошлое')
    const blocked = await this.timeOff
      .createQueryBuilder('timeOff')
      .where('timeOff.specialistId = :specialistId', { specialistId: target.specialistId })
      .andWhere('timeOff.startsAt < :endsAt AND timeOff.endsAt > :startsAt', { startsAt, endsAt })
      .getExists()
    if (blocked) throw new ConflictException('У мастера закрыто это время')
    // Staff may not drop a visit into the master's day off or outside their hours.
    const window = await this.businesses.getOpeningWindow(businessId, target.date)
    const offHours = await this.masterSchedule.offHoursBusy(
      [target.specialistId],
      target.date,
      window,
    )
    if (offHours.some((interval) => startsAt < interval.endsAt && interval.startsAt < endsAt)) {
      throw new ConflictException('Мастер в это время не работает')
    }

    const before = toBusinessParts(booking.startsAt)
    const previous = {
      date: before.dateKey,
      time: formatMinutes(before.minutes),
      specialistId: booking.specialistId,
    }
    try {
      await this.bookings.update(
        { id },
        {
          specialistId: target.specialistId,
          startsAt,
          endsAt,
          // A new time needs its own reminder.
          reminderSentAt:
            booking.reminderMinutes !== null &&
            startsAt.getTime() - Date.now() <= booking.reminderMinutes * 60_000
              ? new Date()
              : null,
        },
      )
    } catch (error) {
      if (isOverlapError(error)) throw new ConflictException('Это время у мастера занято')
      throw error
    }

    return {
      view: await this.bookingsService.getView(id),
      previous,
      customerPhone: booking.customerPhone,
    }
  }

  async getStartsAt(id: string) {
    return (await this.bookings.findOneBy({ id }))?.startsAt ?? null
  }

  async cancelBySalon(businessId: string, id: string) {
    const booking = await this.bookings.findOneBy({ id, businessId })
    if (!booking) throw new NotFoundException('Запись не найдена')

    const wasConfirmed = booking.status === 'confirmed'
    if (wasConfirmed) await this.bookingsService.markCancelled(id, 'salon')

    return {
      view: await this.bookingsService.getView(id),
      customerPhone: booking.customerPhone,
      wasConfirmed,
    }
  }
}

export type { OutcomeInput }
