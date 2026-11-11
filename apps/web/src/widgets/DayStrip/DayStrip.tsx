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
}

export const DayStrip = ({ days, value, onChange, marks }: DayStripProps) => {
  const daysRef = useRef<HTMLFieldSetElement>(null)
  const today = days.find((day) => day.isToday)

  // Past days sit to the left: bring the chosen day into view, not the first one.
  useEffect(() => {
    const selected = daysRef.current?.querySelector<HTMLElement>(`[data-day="${value}"]`)
    selected?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [value])

  return (
    <div className={styles.strip}>
      <fieldset aria-label='День' className={styles.days} ref={daysRef}>
        {days.map((day) => (
          <button
            key={day.key}
            type='button'
            className={styles.day}
            aria-label={marks?.has(day.key) ? `${day.label}, есть незакрытые визиты` : day.label}
            aria-pressed={day.key === value}
            data-day={day.key}
            data-today={day.isToday || undefined}
            data-marked={marks?.has(day.key) || undefined}
            onClick={() => onChange(day.key)}
          >
            <span className={styles.weekday}>{day.weekday}</span>
            <span className={styles.number}>{day.dayOfMonth}</span>
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
