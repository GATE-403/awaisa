'use client'

import NextLink from 'next/link'
import { findDay, formatClock, WEEKDAYS_FULL, weekdayOf } from '@/entities/business'
import type { Business } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useToday } from '@/shared/lib/hooks/useToday'
import { BranchesMap } from './BranchesMap'
import styles from './Place.module.css'

interface VisitSectionProps {
  business: Business
}

// Hours with today picked out, where to go and how to reach the place.
export const VisitSection = ({ business }: VisitSectionProps) => {
  const today = useToday()
  const todayWeekday = today ? weekdayOf(today.dayKey) : null
  const pinned = business.branches.some(
    (branch) => branch.latitude !== null && branch.longitude !== null,
  )

  return (
    <section id='visit' className={`${styles.card} ${styles.visit}`} aria-label='Как нас найти'>
      {/* Today is what matters; the week opens on demand. */}
      <details>
        <summary className={styles.hoursSummary}>
          <span className={styles.hoursLabel}>Часы</span>
          <span className={styles.hoursToday}>
            {todayWeekday === null
              ? ' '
              : (() => {
                  const day = findDay(business.hours, todayWeekday)
                  return day
                    ? `Сегодня ${formatClock(day.opensMinutes)}–${formatClock(day.closesMinutes)}`
                    : 'Сегодня выходной'
                })()}
          </span>
        </summary>
        <ul className={styles.hours}>
          {WEEKDAYS_FULL.map((dayName, weekday) => {
            const day = findDay(business.hours, weekday)
            return (
              <li
                key={dayName}
                className={styles.hoursRow}
                data-today={weekday === todayWeekday || undefined}
              >
                <span>{dayName}</span>
                <span>
                  {day
                    ? `${formatClock(day.opensMinutes)}–${formatClock(day.closesMinutes)}`
                    : 'Выходной'}
                </span>
              </li>
            )
          })}
        </ul>
      </details>

      <div>
        <p className={styles.cardEyebrow}>
          {business.branches.length > 1 ? `Филиалы · ${business.branches.length}` : 'Адрес'}
        </p>
        <ul className={styles.branches}>
          {business.branches.map((branch) => (
            <li key={branch.id} className={styles.branch}>
              <span className={styles.branchAddress}>
                {[business.city, branch.address || business.address].filter(Boolean).join(', ')}
              </span>
              {business.branches.length > 1 && (
                <NextLink
                  href={`/${business.slug}/book?branch=${branch.id}`}
                  className={styles.sectionLink}
                >
                  Записаться сюда
                </NextLink>
              )}
              {(branch.phone || business.phone) && (
                <a href={`tel:${branch.phone || business.phone}`} className={styles.branchPhone}>
                  {formatPhone(branch.phone || business.phone)}
                </a>
              )}
            </li>
          ))}
        </ul>
        {pinned && <BranchesMap business={business} />}
      </div>
    </section>
  )
}
