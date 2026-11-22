import type { CountedEntry, Entry } from './types'

// The cabinet's schedule (the day calendar, visits, new bookings, time off) and the master's «Мой день».
const SCHEDULE: Record<string, Entry> = {}

const SCHEDULE_COUNTED: Record<string, CountedEntry> = {}

export { SCHEDULE, SCHEDULE_COUNTED }
