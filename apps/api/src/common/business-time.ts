import { utcOffsetMinutes } from '@awaisa/region'
import { currentRegion } from './region.js'

const OFFSET_TTL_MS = 10 * 60_000
let offset: { minutes: number; readAt: number } | null = null

// The region's offset from UTC now, re-read every ten minutes (these helpers run in tight loops,
// and an Intl lookup per call is slow). Still one offset for every moment: step 2 of
// docs/installation-region.md moves the helpers to the zone itself, so a date across a summer-time
// change gets its own offset.
const businessUtcOffsetMinutes = () => {
  const now = Date.now()
  if (!offset || now - offset.readAt > OFFSET_TTL_MS) {
    offset = { minutes: utcOffsetMinutes(currentRegion(), new Date(now)), readAt: now }
  }
  return offset.minutes
}
const MINUTE_MS = 60_000
const DAY_MINUTES = 24 * 60

const pad = (value: number) => String(value).padStart(2, '0')

const toBusinessParts = (date: Date) => {
  const shifted = new Date(date.getTime() + businessUtcOffsetMinutes() * MINUTE_MS)

  return {
    dateKey: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}

const businessDateTimeToUtc = (dateKey: string, minutes: number) => {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number)
  const utcMidnight = Date.UTC(year, month - 1, day)

  return new Date(utcMidnight + (minutes - businessUtcOffsetMinutes()) * MINUTE_MS)
}

const addDays = (dateKey: string, days: number) =>
  toBusinessParts(businessDateTimeToUtc(dateKey, 12 * 60 + days * DAY_MINUTES)).dateKey

// 0 = Monday … 6 = Sunday, matching working_hours.weekday.
const weekdayOf = (dateKey: string) => {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number)
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7
}

const formatMinutes = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

const parseTime = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** A business day as a UTC range: from its midnight to the next one in business time. */
const businessDayBounds = (dateKey: string) => ({
  dayStart: businessDateTimeToUtc(dateKey, 0),
  dayEnd: businessDateTimeToUtc(dateKey, 24 * 60),
})

export {
  businessDayBounds,
  addDays,
  businessUtcOffsetMinutes,
  businessDateTimeToUtc,
  formatMinutes,
  parseTime,
  toBusinessParts,
  weekdayOf,
}
