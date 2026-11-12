import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, In, QueryFailedError, Repository } from 'typeorm'
import { TimeOff } from '../admin/time-off.entity.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { CatalogService } from '../catalog/catalog.service.js'
import { MasterScheduleService } from '../catalog/master-schedule.service.js'
import type { Service } from '../catalog/service.entity.js'
import {
  addDays,
  businessDateTimeToUtc,
  formatMinutes,
  parseTime,
  toBusinessParts,
} from '../common/business-time.js'
import { normalizePhone } from '../common/phone.js'
import { isSignedToken, visitLink } from '../common/visit-link.js'
import type { Env } from '../config/env.js'
import { Customer } from '../customers/customer.entity.js'
import { InventoryService } from '../inventory/inventory.service.js'
import { LoyaltyService } from '../loyalty/loyalty.service.js'
import { confirmationMessage, rescheduleMessage } from '../notifications/messages.js'
import { SmsService } from '../notifications/sms.service.js'
import { PromotionsService } from '../promotions/promotions.service.js'
import { Review } from '../reviews/review.entity.js'
import { TelegramBotService } from '../telegram/telegram-bot.service.js'
import { cancelledText, movedByClientText, newBookingText } from '../telegram/telegram-messages.js'
import { buildSlots } from './availability.js'
import { Booking } from './booking.entity.js'
import {
  ANY_SPECIALIST_ID,
  BOOKING_DAYS_AHEAD,
  DEPOSIT_REFUND_HOURS,
  PAYMENT_HOLD_MINUTES,
  UNDO_WINDOW_SECONDS,
} from './booking-rules.js'
import type { AvailabilityQuery, CreateBookingInput } from './bookings.schemas.js'
import { PaymentsService } from './payments.service.js'

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
  endsAt: string
  customerName: string
  /** The promotion this visit got; the client pays `price - discount.amount`. */
  discount: { title: string; amount: number } | null
  /** A deposit asked when booked online; null when the service has none. */
  payment: {
    status: NonNullable<Booking['paymentStatus']>
    amount: number
    dueAt: string | null
  } | null
  review: { rating: number; comment: string; reply: string | null } | null
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
  outcome: Booking['outcome']
  paidAmount: number | null
  paymentMethod: Booking['paymentMethod']
}

type OutcomeInput = {
  outcome: 'arrived' | 'no_show' | null
  paidAmount?: number | null
  paymentMethod?: Booking['paymentMethod']
  subscriptionId?: string | null
  certificateCode?: string | null
  certificateAmount?: number | null
  bonusAmount?: number | null
}

const EXCLUSION_VIOLATION = '23P01'

const MAX_CUSTOMER_BOOKINGS = 50

const MAX_RECENT_BOOKINGS = 20

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const isOverlapError = (error: unknown) =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string } | undefined)?.code === EXCLUSION_VIOLATION

const toAdminView = (booking: Booking): AdminBookingView => ({
  ...toView(booking),
  customerPhone: booking.customerPhone,
  comment: booking.comment,
  outcome: booking.outcome,
  paidAmount: booking.paidAmount,
  paymentMethod: booking.paymentMethod,
})

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
    endsAt: booking.endsAt.toISOString(),
    customerName: booking.customerName,
    discount:
      booking.discountAmount && booking.discountTitle
        ? { title: booking.discountTitle, amount: booking.discountAmount }
        : null,
    payment:
      booking.depositAmount && booking.paymentStatus
        ? {
            status: booking.paymentStatus,
            amount: booking.depositAmount,
            dueAt: booking.paymentDueAt?.toISOString() ?? null,
          }
        : null,
    review: booking.review
      ? {
          rating: booking.review.rating,
          comment: booking.review.comment,
          reply: booking.review.reply,
        }
      : null,
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
    private readonly masterSchedule: MasterScheduleService,
    private readonly businesses: BusinessesService,
    private readonly sms: SmsService,
    private readonly telegram: TelegramBotService,
    private readonly config: ConfigService<Env, true>,
    private readonly payments: PaymentsService,
    private readonly promotions: PromotionsService,
    private readonly loyalty: LoyaltyService,
    private readonly inventory: InventoryService,
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
    const discount = await this.promotions.discountFor({
      businessId: service.businessId,
      serviceId: service.id,
      price: service.price,
      date: input.date,
      minutes,
      phone,
      code: input.promoCode ?? null,
    })
    // Online bookings of a service with a deposit hold the slot until the client pays.
    const deposit =
      !staffBusinessId && service.deposit && this.payments.isAvailable
        ? Math.min(service.deposit, service.price - (discount?.amount ?? 0)) || null
        : null
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
            depositAmount: deposit,
            promotionId: discount?.promotionId ?? null,
            discountAmount: discount?.amount ?? null,
            discountTitle: discount?.title ?? null,
            paymentStatus: deposit ? 'pending' : null,
            paymentDueAt: deposit ? new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60_000) : null,
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
        // A deposit first: the confirmation and the owner's message wait for the payment.
        if (deposit) {
          // The acquirer may be down: then the hold is dropped at once, the slot is free again.
          const checkout = await this.payments
            .createCheckout(saved.id, deposit, {
              description: `${view.serviceName}, ${view.business.name}`,
              phone,
            })
            .catch(async (error: unknown) => {
              await this.bookings.update(
                { id: saved.id },
                { status: 'cancelled', cancelledAt: new Date(), paymentStatus: 'expired' },
              )
              throw error
            })
          return {
            ...view,
            cancelToken,
            customerPhone: phone,
            comment: input.comment,
            checkoutUrl: checkout.url,
          }
        }
        if (input.smsConfirmation) {
          void this.sms.sendSafely(phone, confirmationMessage(view, this.linkTo(view.id)))
        }
        // Staff who book a client in already know; the owner's chat hears about the rest.
        if (!staffBusinessId) {
          void this.telegram.notifyBusiness(
            service.businessId,
            newBookingText(view.business.name, view.date, { ...view, customerPhone: phone }),
          )
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
    if (booking.status !== 'cancelled') await this.cancelByClient(booking)

    return this.getView(id)
  }

  // The client picks another time with the same master and service; same slot rules as booking.
  async moveByClient(
    id: string,
    access: { token: string | null; customer: Customer | null },
    target: { date: string; time: string },
  ) {
    const booking = await this.findAccessible(id, access.token, access.customer)
    if (!booking) throw new NotFoundException('Запись не найдена')
    if (booking.status !== 'confirmed') throw new BadRequestException('Запись отменена')
    const now = new Date()
    if (booking.startsAt <= now)
      throw new BadRequestException('Визит уже начался — перенести нельзя')

    const request = await this.resolveRequest(
      booking.serviceId,
      booking.specialistId,
      target.date,
      now,
      null,
      booking.branchId ?? undefined,
    )
    const slot = (await this.buildSlotsFor(request, target.date, now, id)).find(
      (item) => item.time === target.time,
    )
    if (!slot?.isAvailable) throw new ConflictException('Это время уже занято, выберите другое')

    const startsAt = businessDateTimeToUtc(target.date, parseTime(target.time))
    const endsAt = new Date(startsAt.getTime() + request.service.durationMinutes * 60_000)
    try {
      await this.bookings.update(
        { id },
        {
          startsAt,
          endsAt,
          reminderSentAt:
            booking.reminderMinutes !== null &&
            startsAt.getTime() - now.getTime() <= booking.reminderMinutes * 60_000
              ? now
              : null,
        },
      )
    } catch (error) {
      if (isOverlapError(error)) throw new ConflictException('Это время только что заняли')
      throw error
    }

    const view = await this.getView(id)
    if (booking.smsConfirmation) {
      void this.sms.sendSafely(booking.customerPhone, rescheduleMessage(view, this.linkTo(view.id)))
    }
    const before = toBusinessParts(booking.startsAt)
    void this.telegram.notifyBusiness(
      booking.businessId,
      movedByClientText(view.business.name, view.date, {
        ...view,
        previous: `${before.dateKey} ${formatMinutes(before.minutes)}`,
      }),
    )

    return view
  }

  findById(id: string) {
    return this.bookings.findOneBy({ id })
  }

  /** The booking reachable with its token, a signed-in owner of it, or null. */
  async findAccessible(id: string, token: string | null, customer: Customer | null) {
    const booking = await this.bookings.findOneBy({ id })
    if (!booking) return null
    if (
      customer &&
      (booking.customerId === customer.id || booking.customerPhone === customer.phone)
    ) {
      return booking
    }
    if (!token) return null
    if (isSignedToken(id, token, this.secret())) return booking
    const expected = Buffer.from(booking.cancelTokenHash, 'hex')
    const actual = Buffer.from(hashToken(token), 'hex')

    return expected.length === actual.length && timingSafeEqual(expected, actual) ? booking : null
  }

  async restoreByToken(id: string, token: string) {
    return this.restore(await this.verifyToken(id, token))
  }

  async listForCustomer(customer: Customer) {
    const bookings = await this.viewQuery()
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
    if (booking.status !== 'cancelled') await this.cancelByClient(booking)

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

    return bookings.map(toAdminView)
  }

  // Marked by staff once the time has come: arrived (with what was paid) or did not show up.
  async setOutcome(businessId: string, id: string, input: OutcomeInput) {
    const booking = await this.viewQuery()
      .where('booking.id = :id AND booking.businessId = :businessId', { id, businessId })
      .getOne()
    if (!booking) throw new NotFoundException('Запись не найдена')
    if (booking.status !== 'confirmed') throw new BadRequestException('Запись отменена')
    const todayEnd = businessDateTimeToUtc(addDays(toBusinessParts(new Date()).dateKey, 1), 0)
    if (input.outcome && booking.startsAt >= todayEnd) {
      throw new BadRequestException('Отметить визит можно в его день или позже')
    }
    const isArrived = input.outcome === 'arrived'
    const due = booking.service ? booking.service.price - (booking.discountAmount ?? 0) : 0
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

    return toAdminView(await this.viewQuery().where('booking.id = :id', { id }).getOneOrFail())
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
    if (wasConfirmed) await this.markCancelled(id, 'salon')

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

  // The owner hears about it only once the client can no longer undo it.
  private async cancelByClient(booking: Booking) {
    await this.markCancelled(booking.id, 'client')
    setTimeout(() => {
      void (async () => {
        if (!(await this.isCancelled(booking.id))) return
        const view = await this.getView(booking.id)
        await this.telegram.notifyBusiness(
          booking.businessId,
          cancelledText(view.business.name, view.date, view),
        )
      })().catch(() => undefined)
    }, UNDO_WINDOW_SECONDS * 1000).unref()
  }

  private markCancelled(id: string, by: 'client' | 'salon') {
    return this.bookings.update(
      { id },
      { status: 'cancelled', cancelledAt: new Date(), cancelledBy: by },
    )
  }

  // Undo for a cancellation made moments ago: the slot is taken back unless someone booked it.
  private async restore(booking: Booking) {
    if (booking.paymentStatus === 'expired') {
      throw new BadRequestException('Время на оплату вышло — запишитесь заново')
    }
    if (booking.status === 'cancelled') {
      const elapsed = booking.cancelledAt ? Date.now() - booking.cancelledAt.getTime() : Infinity
      if (elapsed > UNDO_WINDOW_SECONDS * 1000) {
        throw new BadRequestException('Вернуть уже нельзя — запишитесь заново')
      }
      try {
        await this.bookings.update(
          { id: booking.id },
          { status: 'confirmed', cancelledAt: null, cancelledBy: null },
        )
      } catch (error) {
        if (isOverlapError(error)) throw new ConflictException('Это время уже заняли')
        throw error
      }
    }

    return this.getView(booking.id)
  }

  /** The pay page for a booking still waiting for its deposit (to pay again from the ticket). */
  async checkoutUrl(id: string, token: string | null, customer: Customer | null) {
    const booking = await this.findAccessible(id, token, customer)
    if (!booking) throw new NotFoundException('Запись не найдена')
    if (booking.paymentStatus !== 'pending') throw new BadRequestException('Оплата не нужна')
    const url = await this.payments.checkoutFor(id)
    if (!url) throw new NotFoundException('Платёж не найден')

    return { url }
  }

  /**
   * The deposit went through: the booking is final — confirmation SMS and the owner's message
   * now. Paid after the hold ran out (the slot was released): the money goes straight back.
   */
  async onPaid(bookingId: string) {
    const result = await this.bookings.update(
      { id: bookingId, paymentStatus: 'pending' },
      { paymentStatus: 'paid', paymentDueAt: null },
    )
    if (!result.affected) {
      const booking = await this.bookings.findOneBy({ id: bookingId })
      if (booking?.paymentStatus === 'expired') {
        await this.payments.refund(bookingId)
        await this.bookings.update({ id: bookingId }, { paymentStatus: 'refunded' })
      }
      return this.getView(bookingId)
    }

    const booking = await this.bookings.findOneByOrFail({ id: bookingId })
    const view = await this.getView(bookingId)
    if (booking.smsConfirmation) {
      void this.sms.sendSafely(
        booking.customerPhone,
        confirmationMessage(view, this.linkTo(view.id)),
      )
    }
    void this.telegram.notifyBusiness(
      booking.businessId,
      newBookingText(view.business.name, view.date, {
        ...view,
        customerPhone: booking.customerPhone,
      }),
    )

    return view
  }

  /**
   * Every minute: unpaid holds past their time are released; deposits of cancelled visits are
   * settled once the undo window has passed — returned when the salon cancelled or the client
   * did it early enough, kept otherwise. Claimed with UPDATE … RETURNING, safe on several instances.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async settlePayments() {
    const expired = await this.claim(
      `UPDATE "bookings" SET "status" = 'cancelled', "cancelled_at" = now(), "payment_status" = 'expired'
       WHERE "payment_status" = 'pending' AND "payment_due_at" < now() AND "status" = 'confirmed'
       RETURNING "id"`,
    )
    await this.payments.failPending(expired.map((row) => row.id))

    const settled = await this.claim(
      `UPDATE "bookings" SET "payment_status" = CASE
         WHEN "cancelled_by" = 'salon'
           OR "starts_at" - "cancelled_at" >= make_interval(hours => ${DEPOSIT_REFUND_HOURS})
         THEN 'refunded' ELSE 'kept' END
       WHERE "status" = 'cancelled' AND "payment_status" = 'paid'
         AND "cancelled_at" < now() - make_interval(secs => ${UNDO_WINDOW_SECONDS})
       RETURNING "id", "payment_status"`,
    )
    for (const row of settled) {
      if (row.payment_status === 'refunded') await this.payments.refund(row.id)
    }
  }

  private async claim(sql: string) {
    const result: unknown = await this.bookings.manager.query(sql)
    // TypeORM returns [rows, affected] for UPDATE … RETURNING on Postgres.
    return (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as {
      id: string
      payment_status?: string
    }[]
  }

  /** The SMS link that opens this visit without signing in. */
  linkTo(id: string) {
    return visitLink(this.webUrl(), id, this.secret())
  }

  private secret() {
    return this.config.get('AUTH_SECRET', { infer: true })
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
      durationMinutes: service.durationMinutes,
      specialistIds,
      busy: [...busy, ...blocked, ...offHours],
    })
  }

  private viewQuery() {
    return this.bookings
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.specialist', 'specialist')
      .leftJoinAndSelect('booking.business', 'business')
      .leftJoinAndSelect('booking.branch', 'branch')
      .leftJoinAndMapOne('booking.review', Review, 'review', 'review.bookingId = booking.id')
  }

  private async verifyToken(id: string, token: string) {
    const booking = await this.bookings.findOneBy({ id })
    if (booking && isSignedToken(id, token, this.secret())) return booking
    const expected = Buffer.from(booking?.cancelTokenHash ?? '', 'hex')
    const actual = Buffer.from(hashToken(token), 'hex')
    if (!booking || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new NotFoundException('Запись не найдена')
    }

    return booking
  }

  async getView(id: string): Promise<BookingView> {
    const booking = await this.viewQuery().where('booking.id = :id', { id }).getOneOrFail()

    return toView(booking)
  }
}

export type { AdminBookingView, BookingView, OutcomeInput }
