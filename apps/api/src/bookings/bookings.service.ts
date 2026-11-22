import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { TimeOff } from '../admin/time-off.entity.js'
import { BillingService } from '../billing/billing.service.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { CatalogService } from '../catalog/catalog.service.js'
import { MasterScheduleService } from '../catalog/master-schedule.service.js'
import {
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
import { ClientMessagesService } from '../notifications/client-messages.service.js'
import { confirmationMessage, rescheduleMessage } from '../notifications/messages.js'
import { whatsappConfirmation, whatsappReschedule } from '../notifications/whatsapp-messages.js'
import { PromotionsService } from '../promotions/promotions.service.js'
import { PushService } from '../push/push.service.js'
import { TelegramBotService } from '../telegram/telegram-bot.service.js'
import { cancelledText, movedByClientText, newBookingText } from '../telegram/telegram-messages.js'
import { AvailabilityService } from './availability.service.js'
import { Booking } from './booking.entity.js'
import { BookingExtra } from './booking-extra.entity.js'
import { PAYMENT_HOLD_MINUTES, UNDO_WINDOW_SECONDS } from './booking-rules.js'
import { type BookingView, bookingViewQuery, isOverlapError, toView } from './booking-shared.js'
import type { CreateBookingInput } from './bookings.schemas.js'
import { PaymentsService } from './payments.service.js'
import { coversService } from './subscription-orders.js'
import { SubscriptionOrdersService } from './subscription-orders.service.js'

const MAX_CUSTOMER_BOOKINGS = 50

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(TimeOff) readonly _timeOff: Repository<TimeOff>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    readonly _catalogService: CatalogService,
    readonly _masterSchedule: MasterScheduleService,
    readonly _businesses: BusinessesService,
    private readonly clientMessages: ClientMessagesService,
    private readonly telegram: TelegramBotService,
    private readonly push: PushService,
    private readonly config: ConfigService<Env, true>,
    private readonly payments: PaymentsService,
    private readonly promotions: PromotionsService,
    private readonly loyalty: LoyaltyService,
    readonly _inventory: InventoryService,
    private readonly availability: AvailabilityService,
    private readonly subscriptionOrders: SubscriptionOrdersService,
    private readonly billing: BillingService,
  ) {}

  /** `staffBusinessId` is set when a member books a client in from the cabinet. */
  async create(
    input: CreateBookingInput,
    customer: Customer | null = null,
    staffBusinessId: string | null = null,
  ) {
    const now = new Date()
    const isForOther = Boolean(customer && input.forOther && !staffBusinessId)
    const phone = customer && !isForOther ? customer.phone : normalizePhone(input.phone)
    if (!phone) throw new BadRequestException('Укажите корректный номер телефона')
    const request = await this.availability.resolveRequest(
      input.serviceId,
      input.specialistId,
      input.date,
      now,
      staffBusinessId,
      input.branchId,
      input.extraServiceIds,
    )
    const { service, services, specialistIds, branchOf } = request
    const minutes = parseTime(input.time)
    const slot = (await this.availability.buildSlotsFor(request, input.date, now)).find(
      (item) => item.time === formatMinutes(minutes),
    )
    if (!slot?.isAvailable) throw new ConflictException('Это время уже занято, выберите другое')

    const startsAt = businessDateTimeToUtc(input.date, minutes)
    const endsAt = new Date(startsAt.getTime() + request.durationMinutes * 60_000)
    const cancelToken = randomBytes(24).toString('base64url')
    const extras = services.slice(1)
    // Paid by the client's own subscription, or by one bought with this booking: it covers the
    // visit's service it is for (any service of a visit of several); the rest is paid as usual.
    const isOwnNumber = Boolean(customer && !isForOther && !staffBusinessId)
    if ((input.subscriptionId || input.subscriptionPlanId) && !isOwnNumber) {
      throw new BadRequestException('Войдите, чтобы записаться по абонементу')
    }
    const coversVisit = (planServiceId: string | null) =>
      services.some((item) => coversService(planServiceId, item.id))
    const subscription = input.subscriptionId
      ? (await this.loyalty.subscriptionsAt(service.businessId, phone)).find(
          (item) => item.id === input.subscriptionId && coversVisit(item.serviceId),
        )
      : null
    if (input.subscriptionId && !subscription) {
      throw new BadRequestException('Абонемент не подходит: закончился, истёк или на другую услугу')
    }
    const plan = input.subscriptionPlanId
      ? await this.subscriptionOrders.findOnlinePlan(service.businessId, input.subscriptionPlanId)
      : null
    if (plan && !coversVisit(plan.service_id === null ? null : String(plan.service_id))) {
      throw new BadRequestException('Этот абонемент на другую услугу')
    }
    const planPrice = plan ? Number(plan.price) : null
    const isBySubscription = Boolean(subscription || plan)
    const discount = isBySubscription
      ? null
      : await this.promotions.discountFor({
          businessId: service.businessId,
          serviceId: service.id,
          price: service.price,
          extras: extras.map((extra) => ({ serviceId: extra.id, price: extra.price })),
          date: input.date,
          minutes,
          phone,
          code: input.promoCode ?? null,
        })
    // Online bookings of services with a deposit hold the slot until the client pays; a visit of
    // several services asks for each one's deposit, never more than the visit costs. Deposits are
    // a paid-plan feature: a place back on the free plan books without one.
    const deposits = services.reduce((sum, item) => sum + (item.deposit ?? 0), 0)
    const isDepositOn =
      !staffBusinessId &&
      !isBySubscription &&
      deposits > 0 &&
      this.payments.isAvailable &&
      (await this.billing.hasFeature(service.businessId, 'deposits'))
    const deposit = isDepositOn
      ? Math.min(deposits, request.price - (discount?.amount ?? 0)) || null
      : null
    const candidates = slot.specialistId
      ? [slot.specialistId, ...specialistIds.filter((id) => id !== slot.specialistId)]
      : specialistIds

    for (const candidateId of candidates) {
      try {
        const saved = await this.saveVisit(
          {
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
            // «Купить абонемент и записаться» holds the slot like a deposit, for the plan's price.
            depositAmount: deposit ?? planPrice,
            subscriptionId: subscription?.id ?? null,
            source: staffBusinessId ? 'staff' : 'online',
            channel: staffBusinessId ? null : (input.channel ?? null),
            promotionId: discount?.promotionId ?? null,
            discountAmount: discount?.amount ?? null,
            discountTitle: discount?.title ?? null,
            paymentStatus: deposit || plan ? 'pending' : null,
            paymentDueAt:
              deposit || plan ? new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60_000) : null,
            // Booked inside the reminder window: the confirmation already does the reminder's job.
            reminderSentAt:
              input.reminderMinutes !== null &&
              startsAt.getTime() - now.getTime() <= input.reminderMinutes * 60_000
                ? now
                : null,
          },
          extras.map((extra) => extra.id),
        )
        const view = await this.getView(saved.id)
        if (customer && !customer.name && !isForOther) {
          await this.customers.update({ id: customer.id }, { name: input.name })
        }
        // The subscription is paid first; the booking is confirmed once it is issued.
        if (plan) {
          const order = await this.subscriptionOrders
            .order(plan, { customerId: customer?.id ?? null, phone }, saved.id)
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
            checkoutUrl: order.checkoutUrl,
          }
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
          void this.clientMessages.send(phone, {
            text: confirmationMessage(view, this.linkTo(view.id)),
            link: this.manageButton(view.id),
            whatsapp: whatsappConfirmation(view, this.linkTo(view.id)),
            billing: { businessId: service.businessId, isOptional: false },
          })
        }
        // Staff who book a client in already know; the owner's chat hears about the rest.
        if (!staffBusinessId) {
          void this.telegram.notifyBusiness(
            service.businessId,
            newBookingText(view.business.name, view.date, { ...view, customerPhone: phone }),
          )
          void this.push.notifyBooking('created', view, service.businessId)
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

    const request = await this.availability.resolveRequest(
      booking.serviceId,
      booking.specialistId,
      target.date,
      now,
      null,
      booking.branchId ?? undefined,
      await this.extraServiceIdsOf(id),
    )
    const slot = (await this.availability.buildSlotsFor(request, target.date, now, id)).find(
      (item) => item.time === target.time,
    )
    if (!slot?.isAvailable) throw new ConflictException('Это время уже занято, выберите другое')

    const startsAt = businessDateTimeToUtc(target.date, parseTime(target.time))
    const endsAt = new Date(startsAt.getTime() + request.durationMinutes * 60_000)
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
      void this.clientMessages.send(booking.customerPhone, {
        text: rescheduleMessage(view, this.linkTo(view.id)),
        link: this.manageButton(view.id),
        whatsapp: whatsappReschedule(view, this.linkTo(view.id)),
        billing: { businessId: booking.businessId, isOptional: false },
      })
    }
    const before = toBusinessParts(booking.startsAt)
    const previous = `${before.dateKey} ${formatMinutes(before.minutes)}`
    void this.telegram.notifyBusiness(
      booking.businessId,
      movedByClientText(view.business.name, view.date, { ...view, previous }),
    )
    void this.push.notifyBooking('moved', { ...view, previous }, booking.businessId)

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
    const bookings = await bookingViewQuery(this.bookings)
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

  /** True while the booking is still cancelled, e.g. once the undo window has passed. */
  async isCancelled(id: string) {
    return (await this.bookings.findOneBy({ id }))?.status === 'cancelled'
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
        await this.push.notifyBooking('cancelled', view, booking.businessId)
      })().catch(() => undefined)
    }, UNDO_WINDOW_SECONDS * 1000).unref()
  }

  markCancelled(id: string, by: 'client' | 'salon') {
    return this.bookings.update(
      { id },
      { status: 'cancelled', cancelledAt: new Date(), cancelledBy: by },
    )
  }

  // Undo for a cancellation made moments ago: the slot is taken back unless someone booked it.
  async restore(booking: Booking) {
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

  /** «Напоминать в Telegram»: the bot link for this booking's number, null without a bot. */
  async telegramLink(id: string, token: string | null, customer: Customer | null) {
    const booking = await this.findAccessible(id, token, customer)
    if (!booking) throw new NotFoundException('Запись не найдена')
    return {
      url: this.clientMessages.linkUrl(booking.id),
      isLinked: await this.clientMessages.isLinked(booking.customerPhone),
    }
  }

  manageButton(id: string) {
    return { label: 'Перенести или отменить', url: this.linkTo(id) }
  }

  linkTo(id: string) {
    return visitLink(this.webUrl(), id, this.secret())
  }

  private secret() {
    return this.config.get('AUTH_SECRET', { infer: true })
  }

  private webUrl() {
    return this.config.get('PUBLIC_WEB_URL', { infer: true })
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

  /** The booking and the services done after its first one, in one transaction. */
  private saveVisit(fields: Partial<Booking>, extraServiceIds: string[]) {
    return this.bookings.manager.transaction(async (manager) => {
      const saved = await manager.save(Booking, manager.create(Booking, fields))
      if (extraServiceIds.length > 0) {
        await manager.insert(
          BookingExtra,
          extraServiceIds.map((serviceId, index) => ({
            bookingId: saved.id,
            position: index + 1,
            serviceId,
          })),
        )
      }
      return saved
    })
  }

  /** The services a visit has after its first one, in order. */
  async extraServiceIdsOf(bookingId: string) {
    const rows = (await this.bookings.manager.query(
      'SELECT "service_id" AS "id" FROM "booking_extras" WHERE "booking_id" = $1 ORDER BY "position"',
      [bookingId],
    )) as { id: string }[]
    return rows.map((row) => row.id)
  }

  async getView(id: string): Promise<BookingView> {
    const booking = await bookingViewQuery(this.bookings)
      .where('booking.id = :id', { id })
      .getOneOrFail()

    return toView(booking)
  }
}
