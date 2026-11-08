import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, In, QueryFailedError, Repository } from 'typeorm'
import { TimeOff } from '../admin/time-off.entity.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { CatalogService } from '../catalog/catalog.service.js'
import type { Service } from '../catalog/service.entity.js'
import {
  addDays,
  businessDateTimeToUtc,
  formatMinutes,
  parseTime,
  toBusinessParts,
} from '../common/business-time.js'
import { normalizePhone } from '../common/phone.js'
import type { Env } from '../config/env.js'
import { Customer } from '../customers/customer.entity.js'
import { confirmationMessage } from '../notifications/messages.js'
import { SmsService } from '../notifications/sms.service.js'
import { buildSlots } from './availability.js'
import { Booking } from './booking.entity.js'
import { ANY_SPECIALIST_ID, BOOKING_DAYS_AHEAD, REMINDER_LEAD_MINUTES } from './booking-rules.js'
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
  business: {
    slug: string
    name: string
    address: string
    phone: string
    mapUrl: string
  }
}

type AdminBookingView = BookingView & {
  customerPhone: string
  comment: string
}

const EXCLUSION_VIOLATION = '23P01'

const MAX_CUSTOMER_BOOKINGS = 50

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const isOverlapError = (error: unknown) =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string } | undefined)?.code === EXCLUSION_VIOLATION

const toView = (booking: Booking): BookingView => {
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
    business: {
      slug: booking.business?.slug ?? '',
      name: booking.business?.name ?? '',
      address: booking.business?.address ?? '',
      phone: booking.business?.phone ?? '',
      mapUrl: booking.business?.mapUrl ?? '',
    },
  }
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(TimeOff) private readonly timeOff: Repository<TimeOff>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    private readonly catalogService: CatalogService,
    private readonly businesses: BusinessesService,
    private readonly sms: SmsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async getAvailability({ serviceId, specialistId, date }: AvailabilityQuery) {
    const now = new Date()
    const request = await this.resolveRequest(serviceId, specialistId, date, now)
    const slots = await this.buildSlotsFor(request, date, now)

    return { date, slots: slots.map(({ time, isAvailable }) => ({ time, isAvailable })) }
  }

  async create(input: CreateBookingInput, customer: Customer | null = null) {
    const now = new Date()
    const phone = customer?.phone ?? normalizePhone(input.phone)
    if (!phone) throw new BadRequestException('Укажите корректный номер телефона')
    const request = await this.resolveRequest(input.serviceId, input.specialistId, input.date, now)
    const { service, specialistIds } = request
    const minutes = parseTime(input.time)
    const slot = (await this.buildSlotsFor(request, input.date, now)).find(
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
            businessId: service.businessId,
            serviceId: service.id,
            specialistId: candidateId,
            startsAt,
            endsAt,
            customerName: input.name,
            customerPhone: phone,
            comment: input.comment,
            status: 'confirmed',
            cancelTokenHash: hashToken(cancelToken),
            customerId: customer?.id ?? null,
            // Booked inside the reminder window: the confirmation already does the reminder's job.
            reminderSentAt:
              startsAt.getTime() - now.getTime() <= REMINDER_LEAD_MINUTES * 60_000 ? now : null,
          }),
        )
        const view = await this.getView(saved.id)
        if (customer && !customer.name) {
          await this.customers.update({ id: customer.id }, { name: input.name })
        }
        void this.sms.sendSafely(phone, confirmationMessage(view, this.webUrl()))

        return { ...view, cancelToken }
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

  async listForCustomer(customer: Customer) {
    const bookings = await this.bookings
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.specialist', 'specialist')
      .leftJoinAndSelect('booking.business', 'business')
      .where(
        new Brackets((query) =>
          query
            .where('booking.customerId = :id', { id: customer.id })
            .orWhere('booking.customerPhone = :phone', { phone: customer.phone }),
        ),
      )
      .orderBy('booking.startsAt', 'DESC')
      .limit(MAX_CUSTOMER_BOOKINGS)
      .getMany()

    return bookings.map(toView)
  }

  async cancelForCustomer(id: string, customer: Customer) {
    const booking = await this.bookings.findOneBy({ id })
    const isOwner =
      booking && (booking.customerId === customer.id || booking.customerPhone === customer.phone)
    if (!booking || !isOwner) throw new NotFoundException('Запись не найдена')
    if (booking.status !== 'cancelled') {
      await this.bookings.update({ id }, { status: 'cancelled' })
    }

    return this.getView(id)
  }

  async getAdminViews(
    businessId: string,
    where: { dayStart: Date; dayEnd: Date },
  ): Promise<AdminBookingView[]> {
    const bookings = await this.bookings
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.specialist', 'specialist')
      .leftJoinAndSelect('booking.business', 'business')
      .where('booking.businessId = :businessId', { businessId })
      .andWhere('booking.startsAt < :dayEnd AND booking.endsAt > :dayStart', where)
      .orderBy('booking.startsAt', 'ASC')
      .getMany()

    return bookings.map((booking) => ({
      ...toView(booking),
      customerPhone: booking.customerPhone,
      comment: booking.comment,
    }))
  }

  async cancelBySalon(businessId: string, id: string) {
    const booking = await this.bookings.findOneBy({ id, businessId })
    if (!booking) throw new NotFoundException('Запись не найдена')

    const wasConfirmed = booking.status === 'confirmed'
    if (wasConfirmed) await this.bookings.update({ id }, { status: 'cancelled' })

    return { view: await this.getView(id), customerPhone: booking.customerPhone, wasConfirmed }
  }

  private webUrl() {
    return this.config.get('PUBLIC_WEB_URL', { infer: true })
  }

  private async resolveRequest(serviceId: string, specialistId: string, date: string, now: Date) {
    const today = toBusinessParts(now).dateKey
    if (date < today || date > addDays(today, BOOKING_DAYS_AHEAD - 1)) {
      throw new BadRequestException(`Запись доступна на ${BOOKING_DAYS_AHEAD} дней вперёд`)
    }

    const service = await this.catalogService.getActiveService(serviceId)
    const business = await this.businesses.findById(service.businessId)
    if (!business.isPublished) throw new BadRequestException('Запись временно недоступна')
    const offering = (await this.catalogService.getSpecialistsForService(serviceId)).map(
      (specialist) => specialist.id,
    )
    const specialistIds =
      specialistId === ANY_SPECIALIST_ID ? offering : offering.filter((id) => id === specialistId)
    if (specialistIds.length === 0) {
      throw new BadRequestException('Этот мастер не выполняет выбранную услугу')
    }

    return { service, specialistIds, slotMinutes: business.slotMinutes }
  }

  private async buildSlotsFor(
    {
      service,
      specialistIds,
      slotMinutes,
    }: { service: Service; specialistIds: string[]; slotMinutes: number },
    date: string,
    now: Date,
  ) {
    const dayStart = businessDateTimeToUtc(date, 0)
    const dayEnd = businessDateTimeToUtc(date, 24 * 60)
    const busy = await this.bookings
      .createQueryBuilder('booking')
      .select(['booking.specialistId', 'booking.startsAt', 'booking.endsAt'])
      .where({ specialistId: In(specialistIds), status: 'confirmed' })
      .andWhere('booking.startsAt < :dayEnd AND booking.endsAt > :dayStart', { dayStart, dayEnd })
      .getMany()
    const blocked = await this.timeOff
      .createQueryBuilder('timeOff')
      .select(['timeOff.specialistId', 'timeOff.startsAt', 'timeOff.endsAt'])
      .where({ specialistId: In(specialistIds) })
      .andWhere('timeOff.startsAt < :dayEnd AND timeOff.endsAt > :dayStart', { dayStart, dayEnd })
      .getMany()

    return buildSlots({
      dateKey: date,
      window: await this.businesses.getOpeningWindow(service.businessId, date),
      slotMinutes,
      now,
      durationMinutes: service.durationMinutes,
      specialistIds,
      busy: [...busy, ...blocked],
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

  async getView(id: string): Promise<BookingView> {
    const booking = await this.bookings.findOneOrFail({
      where: { id },
      relations: { service: true, specialist: true, business: true },
    })

    return toView(booking)
  }
}

export type { AdminBookingView, BookingView }
