import { utcOffsetMinutes } from '@awaisa/region'
import { currentRegion } from '../common/region.js'

// A minimal iCalendar (RFC 5545) writer for the subscribed calendar feeds: pure, so the escaping
// and the line folding are unit-tested.

const LINE_OCTETS = 75
const CRLF = '\r\n'

type IcsEvent = {
  uid: string
  start: Date
  end: Date
  summary: string
  description?: string
  location?: string
  url?: string
  isCancelled?: boolean
  isTentative?: boolean
}

type IcsCalendar = {
  name: string
  /** How often calendar apps should come back, in minutes (a hint; Google decides for itself). */
  refreshMinutes: number
  events: IcsEvent[]
  /** The moment of writing (DTSTAMP). */
  now: Date
}

const encoder = new TextEncoder()

/** TEXT values: backslash, semicolon and comma escaped, line breaks as \n (RFC 5545 3.3.11). */
const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')

/**
 * Splits a content line into lines of at most 75 octets, each continuation starting with a space
 * (RFC 5545 3.1). Never cuts a UTF-8 character in two: Cyrillic letters are two octets.
 */
const foldLine = (line: string) => {
  const parts: string[] = []
  let current = ''
  let octets = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    // The first line holds 75 octets, the rest 74 after their leading space.
    const limit = parts.length === 0 ? LINE_OCTETS : LINE_OCTETS - 1
    if (octets + size > limit) {
      parts.push(current)
      current = ''
      octets = 0
    }
    current += char
    octets += size
  }
  parts.push(current)
  return parts.join(`${CRLF} `)
}

const pad = (value: number) => String(value).padStart(2, '0')

/** 20261121T093000Z */
const formatUtc = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours(),
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`

/** 20261121T153000 on the region's clock at that moment (summer time included). */
const formatLocal = (date: Date) =>
  formatUtc(new Date(date.getTime() + utcOffsetMinutes(currentRegion(), date) * 60_000)).slice(
    0,
    -1,
  )

/** «+0600» and «+06» for a fixed offset in minutes. */
const offsetText = (minutes: number) => {
  const sign = minutes < 0 ? '-' : '+'
  const hours = pad(Math.floor(Math.abs(minutes) / 60))
  return { full: `${sign}${hours}${pad(Math.abs(minutes) % 60)}`, short: `${sign}${hours}` }
}

const timeZoneLines = () => {
  // One STANDARD block at today's offset: right for zones without summer time (Bishkek); calendar
  // apps resolve the TZID by its name anyway.
  const region = currentRegion()
  const { timeZone } = region
  const offset = offsetText(utcOffsetMinutes(region))
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${timeZone}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    `TZOFFSETFROM:${offset.full}`,
    `TZOFFSETTO:${offset.full}`,
    `TZNAME:${offset.short}`,
    'END:STANDARD',
    'END:VTIMEZONE',
  ]
}

const eventLines = (event: IcsEvent, now: Date) => {
  const status = event.isCancelled ? 'CANCELLED' : event.isTentative ? 'TENTATIVE' : 'CONFIRMED'
  return [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART;TZID=${currentRegion().timeZone}:${formatLocal(event.start)}`,
    `DTEND;TZID=${currentRegion().timeZone}:${formatLocal(event.end)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    `STATUS:${status}`,
    // Cancelled visits stop blocking the person's time in their own calendar.
    `TRANSP:${event.isCancelled ? 'TRANSPARENT' : 'OPAQUE'}`,
    'END:VEVENT',
  ]
}

/** The whole VCALENDAR as text with CRLF line ends and folded lines. */
const buildCalendar = (calendar: IcsCalendar) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Awaisa//Calendar feed//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendar.name)}`,
    `X-WR-TIMEZONE:${currentRegion().timeZone}`,
    `REFRESH-INTERVAL;VALUE=DURATION:PT${calendar.refreshMinutes}M`,
    `X-PUBLISHED-TTL:PT${calendar.refreshMinutes}M`,
    ...timeZoneLines(),
    ...calendar.events.flatMap((event) => eventLines(event, calendar.now)),
    'END:VCALENDAR',
  ]
  return `${lines.map(foldLine).join(CRLF)}${CRLF}`
}

export { buildCalendar, escapeText, foldLine, formatLocal, formatUtc }
export type { IcsCalendar, IcsEvent }
