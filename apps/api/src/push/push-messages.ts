import type { PushMessage } from '@awaisa/contracts'
import { weekdayOf } from '../common/business-time.js'

type BookingEvent = 'created' | 'moved' | 'cancelled'

// Who the notice is for: the business's people open the cabinet, a master opens «Мой день».
type Audience = 'member' | 'master'

type PushBooking = {
  id: string
  date: string
  time: string
  serviceName: string
  specialistName: string
  customerName: string
  business: { slug: string; name: string }
  /** The time before a client's move, `YYYY-MM-DD HH:mm`. */
  previous?: string
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const MONTHS = [
  'янв.',
  'февр.',
  'мар.',
  'апр.',
  'мая',
  'июн.',
  'июл.',
  'авг.',
  'сент.',
  'окт.',
  'нояб.',
  'дек.',
]

const TITLES: Record<BookingEvent, string> = {
  created: 'Новая запись',
  moved: 'Клиент перенёс запись',
  cancelled: 'Клиент отменил запись',
}

const DAY_MS = 86_400_000

// A week ahead the weekday is enough («Чт 14:30»); further away it needs the date too.
const NEAR_DAYS = 6

const dayDistance = (dateKey: string, today: string) =>
  Math.round((Date.parse(dateKey) - Date.parse(today)) / DAY_MS)

const formatWhen = (dateKey: string, time: string, today: string) => {
  const weekday = WEEKDAYS[weekdayOf(dateKey)] ?? ''
  const distance = dayDistance(dateKey, today)
  if (distance >= 0 && distance <= NEAR_DAYS) return `${weekday} ${time}`
  const [, month = 1, day = 1] = dateKey.split('-').map(Number)

  return `${weekday} ${day} ${MONTHS[month - 1]} ${time}`
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

const linkFor = (booking: PushBooking, audience: Audience) => {
  const slug = encodeURIComponent(booking.business.slug)
  if (audience === 'master') return `/master/${slug}?date=${booking.date}`

  return `/manage/${slug}?tab=schedule&date=${booking.date}&booking=${booking.id}`
}

/**
 * «Новая запись · Чт 14:30 · Мужская стрижка · Айбек»: the title, then the facts that decide the
 * tap. The business's people also see whose visit it is and where (an owner may have several
 * places); a master sees only their own, so their name would be noise. The tag is the booking id,
 * the same as the open cabinet's own notice, so one booking never shows twice.
 */
const bookingPushMessage = (
  event: BookingEvent,
  booking: PushBooking,
  audience: Audience,
  today: string,
): PushMessage => {
  const facts = [
    formatWhen(booking.date, booking.time, today),
    booking.serviceName,
    firstName(booking.customerName),
  ]
  const lines = [facts.join(' · ')]
  if (event === 'moved' && booking.previous) {
    const [date = '', time = ''] = booking.previous.split(' ')
    lines.push(`Было: ${formatWhen(date, time, today)}`)
  }
  if (audience === 'member') {
    lines.push(`${booking.specialistName} · ${booking.business.name}`)
  }

  return {
    title: TITLES[event],
    body: lines.join('\n'),
    url: linkFor(booking, audience),
    tag: booking.id,
  }
}

export type { Audience, BookingEvent, PushBooking }
export { bookingPushMessage }
