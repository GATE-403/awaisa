'use client'

import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import type { WorkingDay } from '@/shared/api/types'
import { groupWeek, weekdayName, weekdayShortName } from '../../lib/workingHours'
import styles from './WeekHours.module.css'

interface WeekHoursProps {
  hours: WorkingDay[]
  /** 0 = Monday; null before mount (the server never reads the clock). */
  todayWeekday: number | null
  /** «Open until 21:00»; null before mount. */
  status: { isOpen: boolean; label: string } | null
}

const DAYS_IN_WEEK = 7

// «Hours» as a table people read, like hours on a map card: today's status, then the week as rows
// of neighbouring days with the same hours («Mon-Fri 10:00-20:00», «Sun Closed»), today's row
// marked. Seven identical bars on a shared scale said nothing a row could not (the owner asked
// for it to be redone).
export const WeekHours = ({ hours, todayWeekday, status }: WeekHoursProps) => {
  const { t } = useLingui()
  const groups = groupWeek(hours)
  const isEveryDay = groups.length === 1

  const daysLabel = (from: number, to: number) => {
    if (isEveryDay) return t`Daily`
    const first = weekdayShortName(t, from)
    return from === to ? first : `${first}–${weekdayShortName(t, to)}`
  }

  // Screen readers hear the days in full: «Monday to Friday».
  const daysFull = (from: number, to: number) => {
    const first = weekdayName(t, from)
    if (from === to) return first
    return t`${first} to ${ph({ last: weekdayName(t, to) })}`
  }

  return (
    <div className={styles.weekHours}>
      {status && (
        <p className={styles.weekStatus} data-open={status.isOpen || undefined}>
          {status.label}
        </p>
      )}
      <ul className={styles.weekRows} aria-label={t`Hours by day`}>
        {groups.map(({ from, to, range }) => {
          // Every day the same: «Today» would add nothing to «Daily».
          const isToday =
            !isEveryDay && todayWeekday !== null && todayWeekday >= from && todayWeekday <= to
          return (
            <li
              key={from}
              className={styles.weekRow}
              data-today={isToday || undefined}
              data-off={!range || undefined}
            >
              <span className={styles.weekDays}>
                <span aria-hidden='true'>{daysLabel(from, to)}</span>
                <span className={styles.srOnly}>
                  {isEveryDay && to - from === DAYS_IN_WEEK - 1 ? t`Daily` : daysFull(from, to)}
                </span>
                {isToday && <span className={styles.today}>{t`Today`}</span>}
              </span>
              <span className={styles.weekRange}>{range ?? t`Closed`}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
