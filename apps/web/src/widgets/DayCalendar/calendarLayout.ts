import { parseClock } from '@/entities/business'
import type { AdminBooking, TimeOff, WorkingDay } from '@/shared/api/types'

const PX_PER_MINUTE = 1.6
const HOUR = 60
const DEFAULT_RANGE = { start: 9 * HOUR, end: 21 * HOUR }

type Range = { start: number; end: number }

// The visible day spans the opening hours plus anything booked outside them, in whole hours.
const getDayRange = (
  hours: WorkingDay | null,
  bookings: AdminBooking[],
  timeOff: TimeOff[],
): Range => {
  const starts = [
    ...(hours ? [hours.opensMinutes] : []),
    ...bookings.map((booking) => parseClock(booking.time)),
    ...timeOff.map((item) => parseClock(item.from)),
  ]
  const ends = [
    ...(hours ? [hours.closesMinutes] : []),
    ...bookings.map((booking) => parseClock(booking.time) + booking.durationMinutes),
    ...timeOff.map((item) => parseClock(item.to)),
  ]
  if (starts.length === 0) return DEFAULT_RANGE

  return {
    start: Math.floor(Math.min(...starts) / HOUR) * HOUR,
    end: Math.min(24 * HOUR, Math.ceil(Math.max(...ends) / HOUR) * HOUR),
  }
}

const toPx = (minutes: number) => minutes * PX_PER_MINUTE

/** «Колонки»: masters side by side, time running down. «Лента»: masters as rows, time across. */
type CalendarLayout = 'columns' | 'timeline'

// Across, an hour is 240px: a 45-minute visit (180px) has room for its state, time, client and
// service.
const TIMELINE_PX_PER_MINUTE = 4
// Below this width (under half an hour) a timeline block is one line of client and time.
const TIMELINE_COMPACT_PX = 110

// The timeline zooms (pinch, ctrl + wheel, − / +): from the whole day to quarter hours.
const MIN_ZOOM = 1
const MAX_ZOOM = 4

const pxPerMinute = (layout: CalendarLayout, zoom = 1) =>
  layout === 'timeline' ? TIMELINE_PX_PER_MINUTE * zoom : PX_PER_MINUTE

// Between the hours, the marks the zoom has room for: halves from 1.75×, quarters from 3×.
const minorStep = (layout: CalendarLayout, zoom: number) => {
  if (layout !== 'timeline') return null
  if (zoom >= 3) return 15
  if (zoom >= 1.75) return 30
  return null
}

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

export type { CalendarLayout, Range }
// Below this height (50 min) a block is the client and time on one line over the service; from
// there the chip row (state, time) leads; from TALL_BLOCK_PX it also shows a footer line.
const COMPACT_BLOCK_PX = 80
// Tall enough for the footer line (phone or comment, time) under the name and service.
const TALL_BLOCK_PX = 108

// Each master keeps one colour, like calendars in Apple Calendar.
const MASTER_TINTS = [
  'var(--system-blue)',
  'var(--system-green)',
  'var(--system-orange)',
  'var(--system-purple)',
  'var(--system-pink)',
  'var(--system-teal)',
  'var(--system-indigo)',
]

const getMasterTint = (index: number) =>
  MASTER_TINTS[index % MASTER_TINTS.length] ?? MASTER_TINTS[0]

export {
  clampZoom,
  COMPACT_BLOCK_PX,
  MAX_ZOOM,
  MIN_ZOOM,
  minorStep,
  getDayRange,
  getMasterTint,
  HOUR,
  pxPerMinute,
  TALL_BLOCK_PX,
  TIMELINE_COMPACT_PX,
  toPx,
}
