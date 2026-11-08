import { businessDateTimeToUtc, formatMinutes } from '../common/business-time.js'
import { MIN_LEAD_MINUTES, WORK_DAY } from './booking-rules.js'

type BusyInterval = {
  specialistId: string
  startsAt: Date
  endsAt: Date
}

type Slot = {
  time: string
  isAvailable: boolean
  specialistId: string | null
}

type BuildSlotsParams = {
  dateKey: string
  now: Date
  durationMinutes: number
  specialistIds: string[]
  busy: BusyInterval[]
}

const MINUTE_MS = 60_000

const overlaps = (startsAt: Date, endsAt: Date, interval: BusyInterval) =>
  startsAt < interval.endsAt && interval.startsAt < endsAt

const buildSlots = ({ dateKey, now, durationMinutes, specialistIds, busy }: BuildSlotsParams) => {
  const earliestStart = now.getTime() + MIN_LEAD_MINUTES * MINUTE_MS
  const slots: Slot[] = []

  for (
    let minutes = WORK_DAY.startMinutes;
    minutes + durationMinutes <= WORK_DAY.endMinutes;
    minutes += WORK_DAY.slotMinutes
  ) {
    const startsAt = businessDateTimeToUtc(dateKey, minutes)
    const endsAt = new Date(startsAt.getTime() + durationMinutes * MINUTE_MS)
    const isInFuture = startsAt.getTime() >= earliestStart
    const freeSpecialistId = isInFuture
      ? (specialistIds.find((specialistId) =>
          busy.every(
            (interval) =>
              interval.specialistId !== specialistId || !overlaps(startsAt, endsAt, interval),
          ),
        ) ?? null)
      : null

    slots.push({
      time: formatMinutes(minutes),
      isAvailable: freeSpecialistId !== null,
      specialistId: freeSpecialistId,
    })
  }

  return slots
}

export type { BusyInterval, Slot }
export { buildSlots }
