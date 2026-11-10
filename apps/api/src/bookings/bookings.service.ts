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
import { ANY_SPECIALIST_ID, BOOKING_DAYS_AHEAD, UNDO_WINDOW_SECONDS } from './booking-rules.js'
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

const MAX_RECENT_BOOKINGS = 20

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
      // The visit happens at the branch: its address and phone win over the business's.
      address: booking.branch?.address || booking.business?.address || '',
      phone: booking.branch?.phone || booking.business?.phone || '',
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

  async getAvailability({ serviceId, specialistId, date, branchId }: AvailabilityQuery) {
    const now = new Date()
    const request = await this.resolveRequest(serviceId, specialistId, date, now, null, branchId)
    const slots = await this.buildSlotsFor(request, date, now)

    return { date, slots: slots.map(({ time, isAvailable }) => ({ time, isAvailable })) }
  }

  /**
   * The first free time today or tomorrow for each business, for live catalog cards.
   * Uses the business's quickest service with any master — the earliest anyone could come in.
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
    const today = toBusinessParts(new Date()).dateKey
    const entries = await Promise.all(
      rows.map(async ({ slug, serviceId }) => {
        for (const date of [today, addDays(today, 1)]) {
          try {
            const { slots } = await this.getAvailability({
              serviceId,
              specialistId: ANY_SPECIALIST_ID,
              date,
            })
            const free = slots.find((slot) => slot.isAvailable)
            if (free) return [slug, { date, time: free.time }] as const
          } catch {
            // A service without masters has no slots; the card just shows no time.
          }
        }

        return [slug, null] as const
      }),
    )

    return Object.fromEntries(entries)
  }

  /** `staffBusinessId` is set when a member books a client in from the cabinet. */
  async create(
    input: CreateBookingInput,
    customer: Customer | null = null,
    staffBusinessId: string | null = null,
  ) {
    const now = new Date()
    const phone = customer?.phone ?? normalizePhone(input.phone)
    if (!phone) throw new BadRequestException('Укажите корректный номер телефона')
    const request = await this.resolveRequest(
      input.serviceId,
      input.specialistId,
      input.date,
      now,
      staffBusinessId,
      input.branchId,
    )
    const { service, specialistIds, branchOf } = request
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
            branchId:
              branchOf(candidateId) ??
              input.branchId ??
              (await this.defaultBranchId(service.businessId)),
            smsConfirmation: input.smsConfirmation,
            reminderMinutes: input.reminderMinutes,
            // Booked inside the reminder window: the confirmation already does the reminder's job.
            reminderSentAt:
              input.reminderMinutes !== null &&
              startsAt.getTime() - now.getTime() <= input.reminderMinutes * 60_000
                ? now
                : null,
          }),
        )
        const view = await this.getView(saved.id)
        if (customer && !customer.name) {
          await this.customers.update({ id: customer.id }, { name: input.name })
        }
        if (input.smsConfirmation) {
          void this.sms.sendSafely(phone, confirmationMessage(view, this.webUrl()))
        }

        return { ...view, cancelToken, customerPhone: phone, comment: input.comment }
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
    if (booking.status !== 'cancelled') await this.markCancelled(id)

    return this.getView(id)
  }

  async restoreByToken(id: string, token: string) {
    return this.restore(await this.verifyToken(id, token))
  }

  async listForCustomer(customer: Customer) {
    const bookings = await this.bookings
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.specialist', 'specialist')
      .leftJoinAndSelect('booking.business', 'business')
      .leftJoinAndSelect('booking.branch', 'branch')
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
    if (booking.status !== 'cancelled') await this.markCancelled(id)

    return this.getView(id)
  }

  async findForCustomer(id: string, customer: Customer) {
    const booking = await this.bookings.findOneBy({ id })
    const isOwner =
      booking && (booking.customerId === customer.id || booking.customerPhone === customer.phone)
    if (!booking || !isOwner) throw new NotFoundException('Запись не найдена')

    return this.getView(id)
  }

  async restoreForCustomer(id: string, customer: Customer) {
    const booking = await this.bookings.findOneBy({ id })
    const isOwner =
      booking && (booking.customerId === customer.id || booking.customerPhone === customer.phone)
    if (!booking || !isOwner) throw new NotFoundException('Запись не найдена')

    return this.restore(booking)
  }

  async restoreBySalon(businessId: string, id: string) {
    const booking = await this.bookings.findOneBy({ id, businessId })
    if (!booking) throw new NotFoundException('Запись не найдена')

    return this.restore(booking)
  }

  /** True while the booking is still cancelled, e.g. once the undo window has passed. */
  async isCancelled(id: string) {
    return (await this.bookings.findOneBy({ id }))?.status === 'cancelled'
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
      .leftJoinAndSelect('booking.branch', 'branch')
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

  /** Bookings clients made after `since`, for the cabinet's new-booking alerts. */
  async listCreatedSince(businessId: string, since: Date) {
    const bookings = await this.bookings
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.specialist', 'specialist')
      .leftJoinAndSelect('booking.business', 'business')
      .leftJoinAndSelect('booking.branch', 'branch')
      .where('booking.businessId = :businessId', { businessId })
      .andWhere('booking.createdAt > :since', { since })
      .andWhere("booking.status = 'confirmed'")
      .orderBy('booking.createdAt', 'ASC')
      .limit(MAX_RECENT_BOOKINGS)
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

    const offering = await this.catalogService.getSpecialistsForService(booking.serviceId)
    if (!offering.some((specialist) => specialist.id === target.specialistId)) {
      throw new BadRequestException('Этот мастер не выполняет эту услугу')
    }
    const startsAt = businessDateTimeToUtc(target.date, parseTime(target.time))
    const endsAt = new Date(startsAt.getTime() + (booking.service?.durationMinutes ?? 0) * 60_000)
    const blocked = await this.timeOff
      .createQueryBuilder('timeOff')
      .where('timeOff.specialistId = :specialistId', { specialistId: target.specialistId })
      .andWhere('timeOff.startsAt < :endsAt AND timeOff.endsAt > :startsAt', { startsAt, endsAt })
      .getExists()
    if (blocked) throw new ConflictException('У мастера закрыто это время')

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
      view: await this.getView(id),
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
    if (wasConfirmed) await this.markCancelled(id)

    return { view: await this.getView(id), customerPhone: booking.customerPhone, wasConfirmed }
  }

  // A single-branch business: the booking belongs to that branch.
  private async defaultBranchId(businessId: string) {
    const [branch] = (await this.bookings.manager.query(
      'SELECT "id" FROM "branches" WHERE "business_id" = $1 AND "is_active" ORDER BY "position" LIMIT 1',
      [businessId],
    )) as { id: string }[]

    return branch?.id ?? null
  }

  private markCancelled(id: string) {
    return this.bookings.update({ id }, { status: 'cancelled', cancelledAt: new Date() })
  }

  // Undo for a cancellation made moments ago: the slot is taken back unless someone booked it.
  private async restore(booking: Booking) {
    if (booking.status === 'cancelled') {
      const elapsed = booking.cancelledAt ? Date.now() - booking.cancelledAt.getTime() : Infinity
      if (elapsed > UNDO_WINDOW_SECONDS * 1000) {
        throw new BadRequestException('Вернуть уже нельзя — запишитесь заново')
      }
      try {
        await this.bookings.update({ id: booking.id }, { status: 'confirmed', cancelledAt: null })
      } catch (error) {
        if (isOverlapError(error)) throw new ConflictException('Это время уже заняли')
        throw error
      }
    }

    return this.getView(booking.id)
  }

  private webUrl() {
    return this.config.get('PUBLIC_WEB_URL', { infer: true })
  }

  private async resolveRequest(
    serviceId: string,
    specialistId: string,
    date: string,
    now: Date,
    staffBusinessId: string | null = null,
    branchId?: string,
  ) {
    const today = toBusinessParts(now).dateKey
    if (date < today || date > addDays(today, BOOKING_DAYS_AHEAD - 1)) {
      throw new BadRequestException(`Запись доступна на ${BOOKING_DAYS_AHEAD} дней вперёд`)
    }

    const service = await this.catalogService.getActiveService(serviceId)
    if (staffBusinessId !== null && service.businessId !== staffBusinessId) {
      throw new NotFoundException('Услуга не найдена')
    }
    const business = await this.businesses.findById(service.businessId)
    // Staff can book clients in before the page is published.
    if (!business.isPublished && staffBusinessId === null) {
      throw new BadRequestException('Запись временно недоступна')
    }
    const offering = await this.catalogService.getSpecialistsForService(serviceId)
    const inBranch = offering.filter(
      (specialist) => !branchId || specialist.branchId === null || specialist.branchId === branchId,
    )
    const specialistIds = (
      specialistId === ANY_SPECIALIST_ID
        ? inBranch
        : offering.filter((specialist) => specialist.id === specialistId)
    ).map((specialist) => specialist.id)
    if (specialistIds.length === 0) {
      throw new BadRequestException(
        specialistId === ANY_SPECIALIST_ID
          ? 'В этом филиале нет мастеров на эту услугу'
          : 'Этот мастер не выполняет выбранную услугу',
      )
    }
    const branchOf = (id: string) =>
      offering.find((specialist) => specialist.id === id)?.branchId ?? null

    return { service, specialistIds, branchOf, slotMinutes: business.slotMinutes }
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
      relations: { service: true, specialist: true, business: true, branch: true },
    })

    return toView(booking)
  }
}

export type { AdminBookingView, BookingView }
