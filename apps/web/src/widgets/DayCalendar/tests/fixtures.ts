import type { AdminBooking, TimeOff } from '@/shared/api/types'

// Only the fields the day's layout reads; the rest of a booking does not matter to it.
const booking = (time: string, durationMinutes: number, extra: Partial<AdminBooking> = {}) =>
  ({ id: `${time}-${durationMinutes}`, time, durationMinutes, status: 'confirmed', ...extra }) as
    // A partial booking stands for the whole: the layout reads only these fields.
    AdminBooking

const timeOff = (from: string, to: string) =>
  // Only the span is read.
  ({ id: `${from}-${to}`, from, to }) as TimeOff

const DAY = { opensMinutes: 10 * 60, closesMinutes: 20 * 60 }

const at = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export { at, booking, DAY, timeOff }
