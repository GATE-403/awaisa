'use client'

import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { useNextSlot } from '@/entities/booking'
import { PersonAvatar } from '@/entities/business'
import type { Booking } from '@/shared/api/types'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { useRecentVisits } from '../model/useRecentVisits'
import styles from './RecentVisits.module.css'

interface RecentVisitsProps {
  /** Called when a row is chosen (closes the search panel). */
  onSelect?: () => void
}

const VisitRow = ({ booking, onSelect }: { booking: Booking; onSelect?: () => void }) => {
  const { t } = useLingui()
  const slot = useNextSlot(booking.serviceId, { specialistId: booking.specialistId })
  const dayLabel = slot ? t(slot.dayLabel) : ''
  const firstName = booking.specialistName.split(' ')[0]
  const href = `/${booking.business.slug}/book?${new URLSearchParams({
    service: booking.serviceId,
    specialist: booking.specialistId,
    ...(slot ? { date: slot.date, time: slot.time } : {}),
  })}`

  return (
    <li>
      <NextLink
        href={href}
        className={styles.row}
        onClick={onSelect}
        aria-label={`${t`Book again: ${ph({ service: booking.serviceName })}, ${ph({ name: firstName })}`}${slot ? `, ${t`${ph({ day: dayLabel.toLowerCase() })} from ${ph({ time: slot.time })}`}` : ''}`}
      >
        <PersonAvatar name={booking.specialistName} size='sm' />
        <span className={styles.text}>
          <span className={styles.service}>{booking.serviceName}</span>
          <span className={styles.meta}>
            {firstName} · {booking.business.name}
          </span>
        </span>
        <span className={styles.slot}>{slot ? `${dayLabel} ${slot.time}` : t`Book`}</span>
      </NextLink>
    </li>
  )
}

// «Again with your specialist» where people start looking - the search panel, like recent searches:
// one tap books the same service with the same master at their next free time.
export const RecentVisits = ({ onSelect }: RecentVisitsProps) => {
  const { t } = useLingui()
  const visits = useRecentVisits()
  if (visits.length === 0) return null

  return (
    <section aria-label={t`Book again`}>
      <p className={styles.heading}>{t`Book again`}</p>
      <ul className={styles.list}>
        {visits.map((booking) => (
          <VisitRow key={booking.id} booking={booking} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  )
}
