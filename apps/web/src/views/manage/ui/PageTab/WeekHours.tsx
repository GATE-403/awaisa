import type { CSSProperties } from 'react'
import {
  findDay,
  formatClock,
  formatWeekSchedule,
  WEEKDAYS_FULL,
  WEEKDAYS_SHORT,
} from '@/entities/business'
import type { WorkingDay } from '@/shared/api/types'
import styles from './PageTab.module.css'

interface WeekHoursProps {
  hours: WorkingDay[]
  /** 0 = Monday; null before mount (the server never reads the clock). */
  todayWeekday: number | null
  /** «Открыто до 21:00»; null before mount. */
  status: { isOpen: boolean; label: string } | null
}

const HOUR = 60

// «Время» at a glance: today's status large, the week in one line under it, then the week as a
// chart, each day a track with its open hours filled on one shared scale (the earliest opening to
// the latest closing of the week), so a short day or a day off shows without reading the numbers.
export const WeekHours = ({ hours, todayWeekday, status }: WeekHoursProps) => {
  const start = Math.floor(Math.min(...hours.map((day) => day.opensMinutes)) / HOUR) * HOUR
  const end = Math.ceil(Math.max(...hours.map((day) => day.closesMinutes)) / HOUR) * HOUR
  const span = Math.max(end - start, HOUR)

  return (
    <div className={styles.weekHours}>
      <div className={styles.weekHead}>
        {status && (
          <p className={styles.weekStatus} data-open={status.isOpen || undefined}>
            {status.label}
          </p>
        )}
        <p className={styles.weekSummary}>{formatWeekSchedule(hours)}</p>
      </div>
      {hours.length > 0 && (
        <ul className={styles.weekChart} aria-label='Часы по дням'>
          {WEEKDAYS_FULL.map((dayName, weekday) => {
            const day = findDay(hours, weekday)
            const range = day
              ? `${formatClock(day.opensMinutes)}–${formatClock(day.closesMinutes)}`
              : 'Выходной'
            const bar = day
              ? ({
                  '--from': (day.opensMinutes - start) / span,
                  '--to': (day.closesMinutes - start) / span,
                } as CSSProperties)
              : undefined
            return (
              <li
                key={dayName}
                className={styles.weekDay}
                data-today={todayWeekday === weekday || undefined}
                data-off={!day || undefined}
              >
                <span className={styles.weekDayName} title={dayName}>
                  {WEEKDAYS_SHORT[weekday]}
                </span>
                <span className={styles.weekTrack} aria-hidden='true'>
                  {bar && <span className={styles.weekBar} style={bar} />}
                </span>
                <span className={styles.weekRange}>
                  <span className={styles.srOnly}>{dayName}: </span>
                  {range}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {hours.length > 0 && (
        <p className={styles.weekScale} aria-hidden='true'>
          <span>{formatClock(start)}</span>
          <span>{formatClock(end)}</span>
        </p>
      )}
    </div>
  )
}
