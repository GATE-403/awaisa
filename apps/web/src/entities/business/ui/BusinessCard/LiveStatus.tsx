'use client'

import { addDayKey } from '@/entities/booking'
import { useToday } from '@/shared/lib/hooks/useToday'
import styles from './BusinessCard.module.css'
import { useNextFree } from './NextFreeProvider'

interface LiveStatusProps {
  slug: string
}

// What a client actually asks first — "can I come today?" — instead of a marketing blurb.
export const LiveStatus = ({ slug }: LiveStatusProps) => {
  const today = useToday()
  const nextFree = useNextFree()
  if (!today) return <span className={styles.live}>&nbsp;</span>

  const slot = nextFree?.[slug]
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
          {when === 'сегодня' ? 'Сегодня' : 'Завтра'} с {slot.time}
        </span>
      ) : (
        nextFree !== undefined && <span className={styles.busy}>Ближайшие дни заняты</span>
      )}
    </span>
  )
}
