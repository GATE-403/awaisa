'use client'

import { useEffect, useRef } from 'react'
import type { BookingDay } from '@/entities/booking'
import styles from './DayStrip.module.css'

interface DayStripProps {
  days: BookingDay[]
  value: string | null
  onChange: (dayKey: string) => void
  /** Days with something to do (e.g. visits not closed yet): a small dot under the number. */
  marks?: ReadonlySet<string>
  /** `compact`: one thin line of «чт 19» capsules (the cabinet); default: weekday over number. */
  variant?: 'default' | 'compact'
}

export const DayStrip = ({ days, value, onChange, marks, variant = 'default' }: DayStripProps) => {
  const daysRef = useRef<HTMLFieldSetElement>(null)
  const today = days.find((day) => day.isToday)

  // Past days sit to the left: bring the chosen day into view, not the first one.
  useEffect(() => {
    const selected = daysRef.current?.querySelector<HTMLElement>(`[data-day="${value}"]`)
    selected?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [value])

  return (
    <div className={styles.strip} data-variant={variant}>
      <fieldset aria-label='День' className={styles.days} ref={daysRef}>
        {days.map((day) => (
          <button
            key={day.key}
            type='button'
            className={styles.day}
            aria-pressed={day.key === value}
            data-day={day.key}
            data-today={day.isToday || undefined}
            data-marked={marks?.has(day.key) || undefined}
            onClick={() => onChange(day.key)}
          >
            <span className={styles.weekday}>{day.weekday}</span>
            <span className={styles.number}>{day.dayOfMonth}</span>
            {/* The full date after the visible «Сб 7», not instead of it (WCAG 2.5.3). */}
            <span className={styles.srOnly}>
              {`, ${day.label}${marks?.has(day.key) ? ', есть незакрытые визиты' : ''}`}
            </span>
          </button>
        ))}
      </fieldset>
      {today && (
        <button
          type='button'
          className={styles.today}
          onClick={() => onChange(today.key)}
          disabled={value === today.key}
        >
          Сегодня
        </button>
      )}
    </div>
  )
}
