'use client'

import { Bell, Phone } from '@phosphor-icons/react/ssr'
import type { CSSProperties } from 'react'
import { useSyncExternalStore } from 'react'
import { parseClock } from '@/entities/business'
import type { AdminBooking } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import styles from './NowBar.module.css'

interface NowBarProps {
  bookings: AdminBooking[]
  nowMinutes: number
  /** Opens the booking sheet, the same as tapping its block in the calendar. */
  onOpen: (booking: AdminBooking) => void
}

const SOON_MINUTES = 15

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

// Two glanceable tiles over today's calendar, like a widget: who is in the chair (with how much
// of the visit is done) and who is next (with the countdown and a call button). A tile opens
// its booking.
export const NowBar = ({ bookings, nowMinutes, onOpen }: NowBarProps) => {
  const permission = useSyncExternalStore(subscribeNoop, getPermission, () => 'denied')
  const live = bookings
    .filter((booking) => booking.status === 'confirmed')
    .sort((first, second) => first.time.localeCompare(second.time))
  const current = live.find((booking) => {
    const start = parseClock(booking.time)
    return start <= nowMinutes && nowMinutes < start + booking.durationMinutes
  })
  const next = live.find((booking) => parseClock(booking.time) > nowMinutes)
  const wait = next ? parseClock(next.time) - nowMinutes : 0
  const progress = current
    ? Math.min(1, (nowMinutes - parseClock(current.time)) / current.durationMinutes)
    : 0
  const left = current
    ? Math.max(0, parseClock(current.time) + current.durationMinutes - nowMinutes)
    : 0

  // Nothing in the chair and nothing ahead: no row at all — the calendar under it says enough.
  if (!current && !next) return null

  const enableNotifications = () => {
    void Notification.requestPermission()
  }

  return (
    // One slim row over the day: who is in the chair and who is next, as capsules that open their
    // visit — the day's own cards say the rest.
    <section className={styles.bar} aria-label='Сейчас'>
      {current && (
        <button
          type='button'
          className={styles.pill}
          data-kind='now'
          style={{ '--progress': progress } as CSSProperties}
          onClick={() => onOpen(current)}
        >
          <span className={styles.live}>Сейчас</span>
          <span className={styles.who}>{current.customerName}</span>
          <span className={styles.meta}>ещё {pluralize(left, ['минута', 'минуты', 'минут'])}</span>
        </button>
      )}
      {next && (
        <span className={styles.nextWrap}>
          <button
            type='button'
            className={styles.pill}
            data-soon={wait <= SOON_MINUTES || undefined}
            onClick={() => onOpen(next)}
          >
            <span className={styles.label}>Далее</span>
            <span className={styles.who}>
              {next.time} · {next.customerName}
            </span>
            <span className={styles.meta}>{formatWait(wait)}</span>
          </button>
          {next.customerPhone && (
            <a
              href={`tel:${next.customerPhone}`}
              className={styles.call}
              aria-label={`Позвонить: ${next.customerName}`}
              title='Позвонить'
            >
              <Phone aria-hidden />
            </a>
          )}
        </span>
      )}
      {permission === 'default' && (
        <button type='button' className={styles.notify} onClick={enableNotifications}>
          <Bell aria-hidden />
          Уведомлять о записях
        </button>
      )}
    </section>
  )
}
