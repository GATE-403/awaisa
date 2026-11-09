import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { BookingsService } from '../bookings/bookings.service.js'
import type { Business } from '../businesses/business.entity.js'
import { CatalogService } from '../catalog/catalog.service.js'
import {
  businessDateTimeToUtc,
  formatMinutes,
  parseTime,
  toBusinessParts,
} from '../common/business-time.js'
import type { Env } from '../config/env.js'
import { salonCancellationMessage } from '../notifications/messages.js'
import { SmsService } from '../notifications/sms.service.js'
import type { CreateTimeOffInput, StaffBookingInput } from './admin.schemas.js'
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
    private readonly catalog: CatalogService,
    private readonly sms: SmsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async getSchedule(business: Business, date: string) {
    const bounds = dayBounds(date)
    const specialists = await this.catalog.listActiveSpecialists(business.id)
    const [bookings, timeOff] = await Promise.all([
      this.bookings.getAdminViews(business.id, bounds),
      specialists.length === 0
        ? []
        : this.timeOff
            .createQueryBuilder('timeOff')
            .where({ specialistId: In(specialists.map(({ id }) => id)) })
            .andWhere('timeOff.startsAt < :dayEnd AND timeOff.endsAt > :dayStart', bounds)
            .orderBy('timeOff.startsAt', 'ASC')
            .getMany(),
    ])

    return {
      date,
      specialists: specialists.map(({ id, name, role }) => ({ id, name, role })),
      bookings,
      timeOff: timeOff.map(toTimeOffView),
    }
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

  async cancelBooking(business: Business, id: string) {
    const { view, customerPhone, wasConfirmed } = await this.bookings.cancelBySalon(business.id, id)
    if (wasConfirmed) {
      const webUrl = this.config.get('PUBLIC_WEB_URL', { infer: true })
      void this.sms.sendSafely(customerPhone, salonCancellationMessage(view, webUrl))
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
      await this.bookings.getAdminViews(business.id, { dayStart: startsAt, dayEnd: endsAt })
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
