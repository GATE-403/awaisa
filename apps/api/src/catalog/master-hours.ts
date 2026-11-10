import type { BusyInterval, OpeningWindow } from '../bookings/availability.js'
import { businessDateTimeToUtc } from '../common/business-time.js'

/** A master's day: their hours inside the business window, or null for a day off. */
type MasterDay = { opensMinutes: number; closesMinutes: number } | null

// Works within the business window only: when the business is closed, nobody is bookable.
const clampToWindow = (day: MasterDay, window: OpeningWindow): MasterDay => {
  if (!day) return null
  const opensMinutes = Math.max(day.opensMinutes, window.opensMinutes)
  const closesMinutes = Math.min(day.closesMinutes, window.closesMinutes)

  return closesMinutes > opensMinutes ? { opensMinutes, closesMinutes } : null
}

// The parts of the business day a master does not work become busy time, so slot building
// (pure `buildSlots`) needs no notion of personal hours.
const offHoursAsBusy = (
  specialistId: string,
  dateKey: string,
  window: OpeningWindow,
  day: MasterDay,
): BusyInterval[] => {
  const at = (minutes: number) => businessDateTimeToUtc(dateKey, minutes)
  const own = clampToWindow(day, window)
  if (!own) {
    return [{ specialistId, startsAt: at(window.opensMinutes), endsAt: at(window.closesMinutes) }]
  }

  return [
    own.opensMinutes > window.opensMinutes
      ? { specialistId, startsAt: at(window.opensMinutes), endsAt: at(own.opensMinutes) }
      : null,
    own.closesMinutes < window.closesMinutes
      ? { specialistId, startsAt: at(own.closesMinutes), endsAt: at(window.closesMinutes) }
      : null,
  ].filter((interval): interval is BusyInterval => interval !== null)
}

export type { MasterDay }
export { clampToWindow, offHoursAsBusy }
