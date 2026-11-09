'use client'

import { Bell } from '@phosphor-icons/react/ssr'
import { useSyncExternalStore } from 'react'
import type { AdminBooking } from '@/common/api/types'
import { pluralize } from '@/common/utils/plural'
import { parseClock } from '@/common/utils/workingHours'
import { addMinutes } from '../../manageUtils'
import styles from './NowBar.module.css'

interface NowBarProps {
  bookings: AdminBooking[]
  nowMinutes: number
}

const subscribeNoop = () => () => {}

const getPermission = () => ('Notification' in window ? Notification.permission : 'denied')

const formatWait = (minutes: number) => {
  if (minutes < 60) return `через ${pluralize(minutes, ['минуту', 'минуты', 'минут'])}`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest === 0
    ? `через ${pluralize(hours, ['час', 'часа', 'часов'])}`
    : `через ${hours} ч ${rest} мин`
}

// One glanceable line above today's calendar, like a widget: who is in the chair and who is next.
export const NowBar = ({ bookings, nowMinutes }: NowBarProps) => {
  const permission = useSyncExternalStore(subscribeNoop, getPermission, () => 'denied')
  const live = bookings
    .filter((booking) => booking.status === 'confirmed')
    .sort((first, second) => first.time.localeCompare(second.time))
  const current = live.find((booking) => {
    const start = parseClock(booking.time)
    return start <= nowMinutes && nowMinutes < start + booking.durationMinutes
  })
  const next = live.find((booking) => parseClock(booking.time) > nowMinutes)

  const enableNotifications = () => {
    void Notification.requestPermission()
  }

  return (
    <section className={styles.bar} aria-label='Сейчас'>
      <div className={styles.lines}>
        {current && (
          <p className={styles.line}>
            <span className={styles.live}>Сейчас</span>
            <strong>{current.customerName}</strong> · {current.serviceName} ·{' '}
            {current.specialistName} · до {addMinutes(current.time, current.durationMinutes)}
          </p>
        )}
        {next ? (
          <p className={styles.line}>
            <span className={styles.label}>Следующий</span>
            <strong>
              {next.customerName} в {next.time}
            </strong>
            , {formatWait(parseClock(next.time) - nowMinutes)} · {next.serviceName} ·{' '}
            {next.specialistName}
          </p>
        ) : (
          !current && <p className={styles.line}>На сегодня записей больше нет.</p>
        )}
      </div>
      {permission === 'default' && (
        <button type='button' className={styles.notify} onClick={enableNotifications}>
          <Bell weight='bold' aria-hidden />
          Уведомлять о записях
        </button>
      )}
    </section>
  )
}
