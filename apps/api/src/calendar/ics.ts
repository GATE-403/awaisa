// A minimal iCalendar (RFC 5545) writer for the subscribed calendar feeds: pure, so the escaping
// and the line folding are unit-tested.

const TIME_ZONE = 'Asia/Bishkek'
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

const BISHKEK_OFFSET_MS = 6 * 60 * 60_000

/** 20261121T153000 on Bishkek's clock (UTC+6 all year, no daylight saving). */
const formatLocal = (date: Date) =>
  formatUtc(new Date(date.getTime() + BISHKEK_OFFSET_MS)).slice(0, -1)

const TIME_ZONE_LINES = [
  'BEGIN:VTIMEZONE',
  `TZID:${TIME_ZONE}`,
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:+0600',
  'TZOFFSETTO:+0600',
  'TZNAME:+06',
  'END:STANDARD',
  'END:VTIMEZONE',
]

const eventLines = (event: IcsEvent, now: Date) => {
  const status = event.isCancelled ? 'CANCELLED' : event.isTentative ? 'TENTATIVE' : 'CONFIRMED'
  return [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART;TZID=${TIME_ZONE}:${formatLocal(event.start)}`,
    `DTEND;TZID=${TIME_ZONE}:${formatLocal(event.end)}`,
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
    `X-WR-TIMEZONE:${TIME_ZONE}`,
    `REFRESH-INTERVAL;VALUE=DURATION:PT${calendar.refreshMinutes}M`,
    `X-PUBLISHED-TTL:PT${calendar.refreshMinutes}M`,
    ...TIME_ZONE_LINES,
    ...calendar.events.flatMap((event) => eventLines(event, calendar.now)),
    'END:VCALENDAR',
  ]
  return `${lines.map(foldLine).join(CRLF)}${CRLF}`
}

export { buildCalendar, escapeText, foldLine, formatLocal, formatUtc, TIME_ZONE }
export type { IcsCalendar, IcsEvent }
