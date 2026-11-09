'use client'

import { useEffect, useState } from 'react'
import { ANY_SPECIALIST_ID } from '@/entities/booking/config/bookingConstants'
import { getUpcomingDays } from '@/entities/booking/lib/bookingUtils'
import { getAvailability } from '@/shared/api/clientApi'
import { useToday } from '@/shared/lib/hooks/useToday'

type NextSlot = {
  dayLabel: string
  time: string
}

const DAYS_TO_CHECK = 2
const DAY_LABELS = ['Сегодня', 'Завтра']

export const useNextSlot = (serviceId: string) => {
  const today = useToday()
  const [slot, setSlot] = useState<NextSlot | null | undefined>(undefined)
  const todayKey = today?.dayKey

  useEffect(() => {
    if (!todayKey) return

    const controller = new AbortController()
    const days = getUpcomingDays(todayKey, DAYS_TO_CHECK)

    const findSlot = async () => {
      for (const [index, day] of days.entries()) {
        const { slots } = await getAvailability(
          { serviceId, specialistId: ANY_SPECIALIST_ID, date: day.key },
          controller.signal,
        )
        const free = slots.find((item) => item.isAvailable)
        if (free) return { dayLabel: DAY_LABELS[index] ?? day.key, time: free.time }
      }

      return null
    }

    findSlot()
      .then(setSlot)
      .catch(() => {
        if (!controller.signal.aborted) setSlot(null)
      })

    return () => controller.abort()
  }, [todayKey, serviceId])

  return slot
}
