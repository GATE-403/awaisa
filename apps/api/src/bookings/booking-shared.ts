import { QueryFailedError, type Repository } from 'typeorm'
import type { Service } from '../catalog/service.entity.js'
import { formatMinutes, toBusinessParts } from '../common/business-time.js'
import { Review } from '../reviews/review.entity.js'
import type { Booking } from './booking.entity.js'
import { BookingExtra } from './booking-extra.entity.js'

type VisitService = { id: string; name: string; price: number; durationMinutes: number }

type BookingView = {
  id: string
  status: Booking['status']
  serviceId: string
  /** Every service's name joined with « + ». */
  serviceName: string
  /** The whole visit: every service added up. */
  price: number
  durationMinutes: number
  services: VisitService[]
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
  /** The salon marked «Не пришёл»: such a visit is never asked to be rated. */
  isNoShow: boolean
  /** Paid by the client's subscription, drawn when the salon marks «Пришёл». */
  isBySubscription: boolean
  /** «Хочу так»: the work photo the client wants to look like. */
  lookPhotoUrl: string | null
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

const EXCLUSION_VIOLATION = '23P01'
// Two bookings racing for the same time can also end in a deadlock between their exclusion-index
// checks; Postgres cancels one of them. It means the same as an overlap - someone else got the
// time - but surfaced as a 500 under a rush (load/booking-rush.js: 10 of 200 at once).
const DEADLOCK = '40P01'

const errorCode = (error: unknown) =>
  error instanceof QueryFailedError
    ? (error.driverError as { code?: string } | undefined)?.code
    : undefined

const isOverlapError = (error: unknown) => {
  const code = errorCode(error)
  return code === EXCLUSION_VIOLATION || code === DEADLOCK
}

const toAdminView = (booking: Booking): AdminBookingView => ({
  ...toView(booking),
  customerPhone: booking.customerPhone,
  comment: booking.comment,
  outcome: booking.outcome,
  paidAmount: booking.paidAmount,
  paymentMethod: booking.paymentMethod,
})

const toVisitService = (service: Service): VisitService => ({
  id: service.id,
  name: service.name,
  price: service.price,
  durationMinutes: service.durationMinutes,
})

/** Every service of the visit in order: the booking's own first, then the ones added to it. */
const visitServices = (booking: Booking): VisitService[] => [
  ...(booking.service ? [toVisitService(booking.service)] : []),
  ...[...(booking.extras ?? [])]
    .sort((left, right) => left.position - right.position)
    .flatMap((extra) => (extra.service ? [toVisitService(extra.service)] : [])),
]

const toView = (booking: Booking): BookingView => {
  const { dateKey, minutes } = toBusinessParts(booking.startsAt)
  const services = visitServices(booking)

  return {
    id: booking.id,
    status: booking.status,
    serviceId: booking.serviceId,
    serviceName: services.map((service) => service.name).join(' + '),
    price: services.reduce((sum, service) => sum + service.price, 0),
    durationMinutes: services.reduce((sum, service) => sum + service.durationMinutes, 0),
    services,
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
    isNoShow: booking.outcome === 'no_show',
    isBySubscription: Boolean(booking.subscriptionId),
    lookPhotoUrl: booking.lookPhotoId ? booking.lookPhotoUrl : null,
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

/** A booking with everything its view shows: service, master, business, branch and review. */
const bookingViewQuery = (bookings: Repository<Booking>) =>
  bookings
    .createQueryBuilder('booking')
    .leftJoinAndSelect('booking.service', 'service')
    .leftJoinAndMapMany('booking.extras', BookingExtra, 'extra', 'extra.bookingId = booking.id')
    .leftJoinAndSelect('extra.service', 'extraService')
    .leftJoinAndSelect('booking.specialist', 'specialist')
    .leftJoinAndSelect('booking.business', 'business')
    .leftJoinAndSelect('booking.branch', 'branch')
    .leftJoinAndMapOne('booking.review', Review, 'review', 'review.bookingId = booking.id')

export type { AdminBookingView, BookingView, VisitService }
export { bookingViewQuery, isOverlapError, toAdminView, toView, visitServices }
