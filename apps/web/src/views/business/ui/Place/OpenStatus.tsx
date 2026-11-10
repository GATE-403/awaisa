'use client'

import { getOpeningStatus } from '@/entities/business'
import type { WorkingDay } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import styles from './Place.module.css'

interface OpenStatusProps {
  hours: WorkingDay[]
}

// Reads the clock, so it renders on the client only (the server snapshot has no time).
export const OpenStatus = ({ hours }: OpenStatusProps) => {
  const today = useToday()
  if (!today) return null
  const status = getOpeningStatus(hours, today.dayKey, today.minutes)

  return (
    <span className={styles.status} data-open={status.isOpen || undefined}>
      {status.label}
    </span>
  )
}
