'use client'

import { useLingui } from '@lingui/react/macro'
import { getOpeningStatus } from '@/entities/business'
import type { WorkingDay } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import styles from './Place.module.css'

interface OpenStatusProps {
  hours: WorkingDay[]
}

// Reads the clock, so it renders on the client only (the server snapshot has no time). Until then
// a blank line keeps its height, so the description under it does not move when it appears.
export const OpenStatus = ({ hours }: OpenStatusProps) => {
  const { t } = useLingui()
  const today = useToday()
  if (!today) return <span aria-hidden='true'>{'\u00a0'}</span>
  const status = getOpeningStatus(hours, today.dayKey, today.minutes, t)

  return (
    <span className={styles.status} data-open={status.isOpen || undefined}>
      {status.label}
    </span>
  )
}
