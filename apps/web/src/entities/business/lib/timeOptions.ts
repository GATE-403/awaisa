import { formatClock, parseClock } from './workingHours'

const SLOT_MINUTES = 30
const FIRST_TIME = 6 * 60
const LAST_TIME = 24 * 60

const addMinutes = (time: string, minutes: number) => formatClock(parseClock(time) + minutes)

const TIME_OPTIONS = Array.from(
  { length: (LAST_TIME - FIRST_TIME) / SLOT_MINUTES + 1 },
  (_, index) => formatClock(FIRST_TIME + index * SLOT_MINUTES),
)

export { addMinutes, TIME_OPTIONS }
