'use client'

import { useToast } from '@awaisa/ui/Toast'
import { Bell, Clock, HourglassMedium, Phone } from '@phosphor-icons/react/ssr'
import { useSyncExternalStore } from 'react'
import { parseClock } from '@/entities/business'
import { INSTALL_HINT, usePushAlerts } from '@/features/pushAlerts'
import type { AdminBooking } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
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

const formatWait = (minutes: number, t: Translate) => {
  if (minutes < 60) {
    return t('in {time}', { time: t.count(minutes, ['minute', 'minutes']) })
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return t('in {time}', {
    time: rest === 0 ? t.count(hours, ['hour', 'hours']) : t.duration(minutes),
  })
}

// Two glanceable tiles over today's calendar, like a widget: who is in the chair (with how much
// of the visit is done) and who is next (with the countdown and a call button). A tile opens
// its booking.
export const NowBar = ({ bookings, nowMinutes, onOpen }: NowBarProps) => {
  const toast = useToast()
  const t = useT()
  const permission = useSyncExternalStore(subscribeNoop, getPermission, () => 'denied')
  const push = usePushAlerts()
  const live = bookings
    .filter((booking) => booking.status === 'confirmed')
    .sort((first, second) => first.time.localeCompare(second.time))
  const current = live.find((booking) => {
    const start = parseClock(booking.time)
    return start <= nowMinutes && nowMinutes < start + booking.durationMinutes
  })
  const next = live.find((booking) => parseClock(booking.time) > nowMinutes)
  const wait = next ? parseClock(next.time) - nowMinutes : 0
  const left = current
    ? Math.max(0, parseClock(current.time) + current.durationMinutes - nowMinutes)
    : 0

  // Nothing in the chair and nothing ahead: no row at all - the calendar under it says enough.
  if (!current && !next) return null

  // With Web Push on the server the bell subscribes this device (pushes with the cabinet closed);
  // without it, it only lets the open tab show system notices, as before.
  const isPushOffered = push.state === 'off' || push.state === 'install'
  const isBellShown = isPushOffered || (push.state === 'unsupported' && permission === 'default')

  const enableNotifications = async () => {
    if (push.state === 'install') {
      toast.show({
        title: t('Notifications on iPhone'),
        description: t(INSTALL_HINT),
        type: 'info',
      })
      return
    }
    if (push.state !== 'off') {
      void Notification.requestPermission()
      return
    }
    try {
      const isOn = await push.enable()
      if (isOn) toast.show({ title: t('Notifications on'), type: 'success' })
    } catch {
      toast.show({ title: t('Could not turn on notifications'), type: 'error' })
    }
  }

  return (
    // One slim row over the day: who is in the chair and who is next, as capsules that open their
    // visit - the day's own cards say the rest.
    <section className={styles.bar} aria-label={t('Now')}>
      {current && (
        <button
          type='button'
          className={styles.pill}
          data-kind='now'
          onClick={() => onOpen(current)}
        >
          <HourglassMedium className={styles.glyph} aria-hidden />
          <span className={styles.srOnly}>{t('Now')}: </span>
          <span className={styles.who}>{current.customerName}</span>
          <span className={styles.meta}>{t('{count} min left', { count: left })}</span>
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
            <Clock className={styles.glyph} aria-hidden />
            <span className={styles.srOnly}>{t('Next')}: </span>
            <span className={styles.who}>
              {next.time} {next.customerName}
            </span>
            <span className={styles.meta}>{formatWait(wait, t)}</span>
          </button>
          {next.customerPhone && (
            <a
              href={`tel:${next.customerPhone}`}
              className={styles.call}
              aria-label={t('Call {name}', { name: next.customerName })}
              title={t('Call')}
            >
              <Phone aria-hidden />
            </a>
          )}
        </span>
      )}
      {isBellShown && (
        <button
          type='button'
          className={styles.notify}
          onClick={() => void enableNotifications()}
          title={t('Notify me of new bookings')}
        >
          <Bell aria-hidden />
          <span className={styles.srOnly}>{t('Notify about bookings')}</span>
        </button>
      )}
    </section>
  )
}
