'use client'

import type { WorkingDay } from '@/common/api/types'
import { useToday } from '@/common/hooks/useToday'
import { getOpeningStatus } from '@/common/utils/workingHours'
import { addDayKey } from '@/features/booking/bookingUtils'
import styles from './BusinessCard.module.css'
import { useNextFree } from './NextFreeProvider'

interface LiveStatusProps {
  slug: string
  hours: WorkingDay[]
}

// What a client actually asks first — "can I come today?" — instead of a marketing blurb.
export const LiveStatus = ({ slug, hours }: LiveStatusProps) => {
  const today = useToday()
  const nextFree = useNextFree()
  if (!today) return <span className={styles.live}>&nbsp;</span>

  const slot = nextFree?.[slug]
  const opening = getOpeningStatus(hours, today.dayKey, today.minutes)
  const when =
    slot?.date === today.dayKey
      ? 'сегодня'
      : slot?.date === addDayKey(today.dayKey, 1)
        ? 'завтра'
        : null

  return (
    <span className={styles.live}>
      {slot && when ? (
        <span className={styles.free} data-today={when === 'сегодня' || undefined}>
          Свободно {when} с {slot.time}
        </span>
      ) : (
        nextFree !== undefined && <span className={styles.busy}>Ближайшие дни заняты</span>
      )}
      <span className={styles.opening}>{opening.label}</span>
    </span>
  )
}
