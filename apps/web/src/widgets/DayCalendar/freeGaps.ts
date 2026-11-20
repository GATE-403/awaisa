import { parseClock } from '@/entities/business'
import type { AdminBooking, TimeOff } from '@/shared/api/types'

type Span = { from: number; to: number }

type FreeGapsInput = {
  /** The master's working window that day; null = not working. */
  day: { opensMinutes: number; closesMinutes: number } | null
  /** That master's visits and closed time. */
  bookings: AdminBooking[]
  timeOff: TimeOff[]
  /** From when to look (now, on today); the gaps start on the slot grid. */
  from?: number | null
  slotMinutes: number
  /** Only gaps at least this long. */
  minMinutes?: number
}

const toSpans = (bookings: AdminBooking[], timeOff: TimeOff[]): Span[] =>
  [
    ...bookings
      .filter((booking) => booking.status === 'confirmed')
      .map((booking) => {
        const start = parseClock(booking.time)
        return { from: start, to: start + booking.durationMinutes }
      }),
    ...timeOff.map((item) => ({ from: parseClock(item.from), to: parseClock(item.to) })),
  ].sort((first, second) => first.from - second.from)

// A master's free stretches of the day, in minutes from midnight: inside their hours, outside
// visits and closed time, from `from` on (rounded up to the slot grid), at least `minMinutes` long.
const freeGaps = ({
  day,
  bookings,
  timeOff,
  from = null,
  slotMinutes,
  minMinutes = slotMinutes,
}: FreeGapsInput): Span[] => {
  if (!day) return []
  const step = Math.max(1, slotMinutes)
  let cursor =
    from === null ? day.opensMinutes : Math.max(day.opensMinutes, Math.ceil(from / step) * step)
  const gaps: Span[] = []
  for (const busy of toSpans(bookings, timeOff)) {
    if (busy.to <= cursor) continue
    if (busy.from >= day.closesMinutes) break
    if (busy.from - cursor >= minMinutes) gaps.push({ from: cursor, to: busy.from })
    cursor = Math.max(cursor, busy.to)
  }
  if (day.closesMinutes - cursor >= minMinutes) gaps.push({ from: cursor, to: day.closesMinutes })
  return gaps
}

export type { FreeGapsInput, Span }
export { freeGaps }
