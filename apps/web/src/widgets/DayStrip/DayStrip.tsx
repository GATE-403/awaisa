'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
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
  const knobRef = useRef<HTMLSpanElement>(null)
  const today = days.find((day) => day.isToday)

  // Past days sit to the left: bring the chosen day into view, not the first one.
  useEffect(() => {
    const selected = daysRef.current?.querySelector<HTMLElement>(`[data-day="${value}"]`)
    selected?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [value])

  // The compact row's chosen fill is one knob that glides to the picked day (a spring), like the
  // segmented control's — measured and written to CSS variables, no re-render.
  useLayoutEffect(() => {
    const knob = knobRef.current
    const selected = daysRef.current?.querySelector<HTMLElement>(`[data-day="${value}"]`)
    if (!knob || days.length === 0) return
    if (!selected) {
      knob.hidden = true
      return
    }
    knob.hidden = false
    // Glide from the second placement on: the first one (the page opening) lands in place.
    if (knob.hasAttribute('data-placed')) knob.setAttribute('data-ready', '')
    knob.setAttribute('data-placed', '')
    knob.style.setProperty('--x', `${selected.offsetLeft}px`)
    knob.style.setProperty('--w', `${selected.offsetWidth}px`)
    knob.style.setProperty('--h', `${selected.offsetHeight}px`)
    knob.style.setProperty('--y', `${selected.offsetTop}px`)
    knob.toggleAttribute('data-today', selected.hasAttribute('data-today'))
  }, [value, days])

  return (
    <div className={styles.strip} data-variant={variant}>
      <fieldset
        aria-label='День'
        className={styles.days}
        ref={daysRef}
        data-edge-fade={variant === 'compact' || undefined}
      >
        {variant === 'compact' && <span ref={knobRef} className={styles.knob} aria-hidden='true' />}
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
      {/* Always there in the compact row: on another day it opens today, on today it brings the
          row back to it after the days were scrolled away. */}
      {today && (
        <button
          type='button'
          className={styles.today}
          onClick={() => {
            onChange(today.key)
            daysRef.current
              ?.querySelector<HTMLElement>(`[data-day="${today.key}"]`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
          }}
          disabled={variant === 'default' && value === today.key}
        >
          Сегодня
        </button>
      )}
    </div>
  )
}
