import { businessDateTimeToUtc, formatMinutes } from '../common/business-time.js'
import { MIN_LEAD_MINUTES } from './booking-rules.js'

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

type OpeningWindow = {
  opensMinutes: number
  closesMinutes: number
}

type BuildSlotsParams = {
  dateKey: string
  window: OpeningWindow | null
  slotMinutes: number
  now: Date
  durationMinutes: number
  specialistIds: string[]
  busy: BusyInterval[]
}

const MINUTE_MS = 60_000

const overlaps = (startsAt: Date, endsAt: Date, interval: BusyInterval) =>
  startsAt < interval.endsAt && interval.startsAt < endsAt

const buildSlots = ({
  dateKey,
  window,
  slotMinutes,
  now,
  durationMinutes,
  specialistIds,
  busy,
}: BuildSlotsParams) => {
  const earliestStart = now.getTime() + MIN_LEAD_MINUTES * MINUTE_MS
  const slots: Slot[] = []
  if (!window) return slots

  for (
    let minutes = window.opensMinutes;
    minutes + durationMinutes <= window.closesMinutes;
    minutes += slotMinutes
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

export type { BusyInterval, OpeningWindow, Slot }
export { buildSlots }
