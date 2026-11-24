'use client'

import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useEffect, useState } from 'react'
import { ANY_SPECIALIST_ID } from '@/entities/booking/config/bookingConstants'
import { getUpcomingDays } from '@/entities/booking/lib/bookingUtils'
import { getAvailability } from '@/shared/api/clientApi'
import { useToday } from '@/shared/lib/hooks/useToday'

type NextSlot = {
  /** «Today» or «Tomorrow»: show it with `t(slot.dayLabel)`. */
  dayLabel: MessageDescriptor
  /** YYYY-MM-DD, so links can open the booking on that very time. */
  date: string
  time: string
}

const DAYS_TO_CHECK = 2
const DAY_LABELS = [msg`Today`, msg`Tomorrow`]

export const useNextSlot = (
  serviceId: string | null,
  {
    specialistId = ANY_SPECIALIST_ID,
    isEnabled = true,
  }: { specialistId?: string; isEnabled?: boolean } = {},
) => {
  const today = useToday()
  const [slot, setSlot] = useState<NextSlot | null | undefined>(undefined)
  const todayKey = today?.dayKey

  useEffect(() => {
    if (!todayKey || !serviceId || !isEnabled) return

    const controller = new AbortController()
    const days = getUpcomingDays(todayKey, DAYS_TO_CHECK)

    const findSlot = async () => {
      for (const [index, day] of days.entries()) {
        const { slots } = await getAvailability(
          { serviceId, specialistId, date: day.key },
          controller.signal,
        )
        const free = slots.find((item) => item.isAvailable)
        const dayLabel = DAY_LABELS[index]
        if (free && dayLabel) return { dayLabel, date: day.key, time: free.time }
      }

      return null
    }

    findSlot()
      .then(setSlot)
      .catch(() => {
        if (!controller.signal.aborted) setSlot(null)
      })

    return () => controller.abort()
  }, [todayKey, serviceId, specialistId, isEnabled])

  return slot
}
