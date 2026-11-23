'use client'

import NextLink from 'next/link'
import { addDayKey } from '@/entities/booking'
import { useT } from '@/shared/i18n'
import { useToday } from '@/shared/lib/hooks/useToday'
import styles from './BusinessCard.module.css'
import { useNextFree } from './NextFreeProvider'

interface LiveStatusProps {
  slug: string
}

// What a client actually asks first («can I come today?»), answered with the times themselves:
// each capsule opens the booking on that time, the service still to choose.
export const LiveStatus = ({ slug }: LiveStatusProps) => {
  const t = useT()
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

  if (!slot || !when) {
    return (
      <span className={styles.live}>
        {nextFree !== undefined && <span className={styles.busy}>{t('Ближайшие дни заняты')}</span>}
      </span>
    )
  }

  const times = slot.times?.length ? slot.times : [slot.time]
  const dayWord = when === 'сегодня' ? t('Сегодня') : t('Завтра')

  return (
    <span className={styles.live}>
      <span className={styles.free} data-today={when === 'сегодня' || undefined}>
        {dayWord}
      </span>
      {times.map((time) => (
        <NextLink
          key={time}
          href={`/${slug}/book?date=${slot.date}&time=${time}`}
          className={styles.time}
        >
          {time}
          <span className={styles.srOnly}>
            {' '}
            {t('записаться на {day}', { day: dayWord.toLowerCase() })}
          </span>
        </NextLink>
      ))}
    </span>
  )
}
