import { toBusinessParts } from '../common/business-time.js'
import type { IcsEvent } from './ics.js'

/** One visit as the feed reads it from the database. */
type FeedBooking = {
  id: string
  startsAt: Date
  endsAt: Date
  status: 'confirmed' | 'cancelled'
  paymentStatus: string | null
  serviceName: string
  specialistName: string
  customerName: string
  customerPhone: string
  comment: string
  branchName: string | null
  branchAddress: string | null
  price: number
  discountAmount: number | null
}

type FeedOptions = {
  /** A business feed of every master names the master in the title. */
  isMasterNamed: boolean
  /** Whole numbers only when the owner turned them on; otherwise the last three digits. */
  isPhoneShown: boolean
  /** The site's address, for a link back to the visit. */
  webUrl: string
  slug: string
  /** Who opens the link: the cabinet's schedule or the master's own day. */
  audience: 'business' | 'master'
}

const UID_DOMAIN = 'awaisa.kg'

const formatPhone = (phone: string) => {
  const match = /^\+996(\d{3})(\d{3})(\d{3})$/.exec(phone)
  return match ? `+996 ${match[1]} ${match[2]} ${match[3]}` : phone
}

/** «+996 ••• ••• 456»: enough to tell two clients apart, not enough to call. */
const hidePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) return ''
  const country = phone.startsWith('+996') ? '+996 ' : '+'
  return `${country}••• ••• ${digits.slice(-3)}`
}

const formatSom = (amount: number) => `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} сом`

const visitLink = (booking: FeedBooking, options: FeedOptions) => {
  const date = toBusinessParts(booking.startsAt).dateKey
  return options.audience === 'master'
    ? `${options.webUrl}/master/${options.slug}?date=${date}`
    : `${options.webUrl}/manage/${options.slug}?tab=schedule&date=${date}&booking=${booking.id}`
}

/** The calendar's copy of a visit: stable UID, the client's name, the branch and its address. */
const bookingEvent = (booking: FeedBooking, options: FeedOptions): IcsEvent => {
  const isCancelled = booking.status === 'cancelled'
  const client = booking.customerName.trim() || 'Клиент'
  const title = [
    booking.serviceName,
    client,
    ...(options.isMasterNamed ? [booking.specialistName] : []),
  ]
  const phone = options.isPhoneShown
    ? formatPhone(booking.customerPhone)
    : hidePhone(booking.customerPhone)
  const toPay = booking.price - (booking.discountAmount ?? 0)
  const link = visitLink(booking, options)
  const description = [
    `Клиент: ${client}${phone ? `, ${phone}` : ''}`,
    `Мастер: ${booking.specialistName}`,
    `Стоимость: ${formatSom(toPay)}`,
    ...(booking.comment.trim() ? [`Комментарий: ${booking.comment.trim()}`] : []),
    ...(booking.paymentStatus === 'pending' ? ['Ждёт предоплату'] : []),
    ...(isCancelled ? ['Запись отменена'] : []),
    link,
  ]
  const location = [booking.branchName, booking.branchAddress]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')

  return {
    uid: `booking-${booking.id}@${UID_DOMAIN}`,
    start: booking.startsAt,
    end: booking.endsAt,
    summary: `${isCancelled ? 'Отменена: ' : ''}${title.join(' · ')}`,
    description: description.join('\n'),
    location: location || undefined,
    url: link,
    isCancelled,
    isTentative: booking.paymentStatus === 'pending',
  }
}

export { bookingEvent, hidePhone }
export type { FeedBooking, FeedOptions }
