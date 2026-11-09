import type { Booking } from '@/shared/api/types'

const MINUTE_MS = 60_000

const toIcsDate = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

const escapeText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

const createCalendarFile = (booking: Booking, place: { name: string; address: string }) => {
  const startsAt = new Date(booking.startsAt)
  const endsAt = new Date(startsAt.getTime() + booking.durationMinutes * MINUTE_MS)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//awaisa//booking//RU',
    'BEGIN:VEVENT',
    `UID:${booking.id}@awaisa`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(startsAt)}`,
    `DTEND:${toIcsDate(endsAt)}`,
    `SUMMARY:${escapeText(`${booking.serviceName} — ${place.name}`)}`,
    `DESCRIPTION:${escapeText(`Мастер: ${booking.specialistName}`)}`,
    `LOCATION:${escapeText(place.address)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(booking.serviceName)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
}

const downloadCalendarFile = (booking: Booking, place: { name: string; address: string }) => {
  const url = URL.createObjectURL(createCalendarFile(booking, place))
  const link = document.createElement('a')
  link.href = url
  link.download = `awaisa-${booking.date}-${booking.time.replace(':', '')}.ics`
  link.click()
  URL.revokeObjectURL(url)
}

export { downloadCalendarFile }
