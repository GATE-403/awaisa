'use client'

import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { getAvailability } from '@/shared/api/clientApi'
import type { TimeSlot } from '@/shared/api/types'

type AvailabilityResult = {
  key: string
  slots: TimeSlot[]
  error: string | null
}

type UseAvailabilityReturn = {
  slots: TimeSlot[]
  isLoading: boolean
  error: string | null
  reload: () => void
}

export const useAvailability = (
  serviceId: string | null,
  specialistId: string | null,
  date: string | null,
  branchId?: string,
): UseAvailabilityReturn => {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<AvailabilityResult | null>(null)
  const key =
    serviceId && specialistId && date
      ? `${serviceId}|${specialistId}|${date}|${branchId}|${reloadCount}`
      : null
  const isCurrent = key !== null && result?.key === key

  useEffect(() => {
    if (!serviceId || !specialistId || !date) return

    const requestKey = `${serviceId}|${specialistId}|${date}|${branchId}|${reloadCount}`
    const controller = new AbortController()

    getAvailability({ serviceId, specialistId, date, branchId }, controller.signal)
      .then(({ slots }) => setResult({ key: requestKey, slots, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key: requestKey, slots: [], error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [serviceId, specialistId, date, branchId, reloadCount])

  return {
    slots: isCurrent ? result.slots : [],
    isLoading: key !== null && !isCurrent,
    error: isCurrent ? result.error : null,
    reload: () => setReloadCount((count) => count + 1),
  }
}
