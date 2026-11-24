'use client'

import { useEffect, useState } from 'react'
import { getAvailability } from '@/shared/api/clientApi'

type QuickSlot = { dayKey: string; time: string }

interface QuickSlotsInput {
  serviceId: string | null
  specialistId: string | null
  branchId?: string
  /** Open days, nearest first; only the first few are asked. */
  dayKeys: string[]
  isEnabled: boolean
}

const MAX_SLOTS = 3
const MAX_DAYS = 3
// Two times a day at most, so Today and Tomorrow both show when there is room.
const MAX_PER_DAY = 2

/** The nearest free times for one service and master (or “any”), across the next open days. */
export const useQuickSlots = ({
  serviceId,
  specialistId,
  branchId,
  dayKeys,
  isEnabled,
}: QuickSlotsInput) => {
  const days = dayKeys.slice(0, MAX_DAYS).join(',')
  const key = `${serviceId}|${specialistId}|${branchId ?? ''}|${days}`
  const [result, setResult] = useState<{ key: string; slots: QuickSlot[] } | null>(null)

  useEffect(() => {
    if (!isEnabled || !serviceId || !specialistId || !days) return
    const controller = new AbortController()
    const load = async () => {
      const found: QuickSlot[] = []
      for (const date of days.split(',')) {
        const { slots } = await getAvailability(
          { serviceId, specialistId, date, branchId },
          controller.signal,
        )
        const free = slots.filter((slot) => slot.isAvailable).slice(0, MAX_PER_DAY)
        for (const slot of free) found.push({ dayKey: date, time: slot.time })
        if (found.length >= MAX_SLOTS) break
      }
      setResult({ key, slots: found.slice(0, MAX_SLOTS) })
    }
    load().catch(() => {
      if (!controller.signal.aborted) setResult({ key, slots: [] })
    })
    return () => controller.abort()
  }, [isEnabled, serviceId, specialistId, branchId, days, key])

  const isCurrent = result?.key === key
  return { slots: isCurrent ? result.slots : [], isLoading: isEnabled && !isCurrent }
}

export type { QuickSlot }
