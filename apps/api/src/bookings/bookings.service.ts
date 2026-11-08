import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, QueryFailedError, Repository } from 'typeorm'
import { CatalogService } from '../catalog/catalog.service.js'
import type { Service } from '../catalog/service.entity.js'
import {
  addDays,
  businessDateTimeToUtc,
  formatMinutes,
  parseTime,
  toBusinessParts,
} from '../common/business-time.js'
import { buildSlots } from './availability.js'
import { Booking } from './booking.entity.js'
import { ANY_SPECIALIST_ID, BOOKING_DAYS_AHEAD } from './booking-rules.js'
import type { AvailabilityQuery, CreateBookingInput } from './bookings.schemas.js'

type BookingView = {
  id: string
  status: Booking['status']
  serviceId: string
  serviceName: string
  price: number
  durationMinutes: number
  specialistId: string
  specialistName: string
  date: string
  time: string
  startsAt: string
  customerName: string
}

const EXCLUSION_VIOLATION = '23P01'

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const isOverlapError = (error: unknown) =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string } | undefined)?.code === EXCLUSION_VIOLATION

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    private readonly catalogService: CatalogService,
  ) {}

  async getAvailability({ serviceId, specialistId, date }: AvailabilityQuery) {
    const now = new Date()
    const { service, specialistIds } = await this.resolveRequest(serviceId, specialistId, date, now)
    const slots = await this.buildSlotsFor(service, specialistIds, date, now)

    return { date, slots: slots.map(({ time, isAvailable }) => ({ time, isAvailable })) }
  }

  async create(input: CreateBookingInput) {
    const now = new Date()
    const { service, specialistIds } = await this.resolveRequest(
      input.serviceId,
      input.specialistId,
      input.date,
      now,
    )
    const minutes = parseTime(input.time)
    const slot = (await this.buildSlotsFor(service, specialistIds, input.date, now)).find(
      (item) => item.time === formatMinutes(minutes),
    )
    if (!slot?.isAvailable) throw new ConflictException('Это время уже занято, выберите другое')

    const startsAt = businessDateTimeToUtc(input.date, minutes)
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000)
    const cancelToken = randomBytes(24).toString('base64url')
    const candidates = slot.specialistId
      ? [slot.specialistId, ...specialistIds.filter((id) => id !== slot.specialistId)]
      : specialistIds

    for (const candidateId of candidates) {
      try {
        const saved = await this.bookings.save(
          this.bookings.create({
            serviceId: service.id,
            specialistId: candidateId,
            startsAt,
            endsAt,
            customerName: input.name,
            customerPhone: input.phone,
            comment: input.comment,
            status: 'confirmed',
            cancelTokenHash: hashToken(cancelToken),
          }),
        )

        return { ...(await this.getView(saved.id)), cancelToken }
      } catch (error) {
        if (!isOverlapError(error)) throw error
      }
    }

    throw new ConflictException('Это время только что заняли, выберите другое')
  }

  async findByToken(id: string, token: string) {
    await this.verifyToken(id, token)
    return this.getView(id)
  }

  async cancel(id: string, token: string) {
    const booking = await this.verifyToken(id, token)
    if (booking.status !== 'cancelled') {
      await this.bookings.update({ id }, { status: 'cancelled' })
    }

    return this.getView(id)
  }

  private async resolveRequest(serviceId: string, specialistId: string, date: string, now: Date) {
    const today = toBusinessParts(now).dateKey
    if (date < today || date > addDays(today, BOOKING_DAYS_AHEAD - 1)) {
      throw new BadRequestException(`Запись доступна на ${BOOKING_DAYS_AHEAD} дней вперёд`)
    }

    const service = await this.catalogService.getActiveService(serviceId)
    const offering = (await this.catalogService.getSpecialistsForService(serviceId)).map(
      (specialist) => specialist.id,
    )
    const specialistIds =
      specialistId === ANY_SPECIALIST_ID ? offering : offering.filter((id) => id === specialistId)
    if (specialistIds.length === 0) {
      throw new BadRequestException('Этот мастер не выполняет выбранную услугу')
    }

    return { service, specialistIds }
  }

  private async buildSlotsFor(service: Service, specialistIds: string[], date: string, now: Date) {
    const dayStart = businessDateTimeToUtc(date, 0)
    const dayEnd = businessDateTimeToUtc(date, 24 * 60)
    const busy = await this.bookings
      .createQueryBuilder('booking')
      .select(['booking.specialistId', 'booking.startsAt', 'booking.endsAt'])
      .where({ specialistId: In(specialistIds), status: 'confirmed' })
      .andWhere('booking.startsAt < :dayEnd AND booking.endsAt > :dayStart', { dayStart, dayEnd })
      .getMany()

    return buildSlots({
      dateKey: date,
      now,
      durationMinutes: service.durationMinutes,
      specialistIds,
      busy,
    })
  }

  private async verifyToken(id: string, token: string) {
    const booking = await this.bookings.findOneBy({ id })
    const expected = Buffer.from(booking?.cancelTokenHash ?? '', 'hex')
    const actual = Buffer.from(hashToken(token), 'hex')
    if (!booking || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new NotFoundException('Запись не найдена')
    }

    return booking
  }

  private async getView(id: string): Promise<BookingView> {
    const booking = await this.bookings.findOneOrFail({
      where: { id },
      relations: { service: true, specialist: true },
    })
    const { dateKey, minutes } = toBusinessParts(booking.startsAt)

    return {
      id: booking.id,
      status: booking.status,
      serviceId: booking.serviceId,
      serviceName: booking.service?.name ?? '',
      price: booking.service?.price ?? 0,
      durationMinutes: booking.service?.durationMinutes ?? 0,
      specialistId: booking.specialistId,
      specialistName: booking.specialist?.name ?? '',
      date: dateKey,
      time: formatMinutes(minutes),
      startsAt: booking.startsAt.toISOString(),
      customerName: booking.customerName,
    }
  }
}

export type { BookingView }
