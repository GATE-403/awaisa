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

export type { Range }
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

export { COMPACT_BLOCK_PX, getDayRange, getMasterTint, HOUR, TALL_BLOCK_PX, toPx }
