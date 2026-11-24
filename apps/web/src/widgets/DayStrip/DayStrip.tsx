'use client'

import { CircleDashed } from '@phosphor-icons/react/ssr'
import { type CSSProperties, useEffect, useLayoutEffect, useRef } from 'react'
import type { BookingDay } from '@/entities/booking'
import { useT } from '@/shared/i18n'
import styles from './DayStrip.module.css'

interface DayStripProps {
  days: BookingDay[]
  value: string | null
  onChange: (dayKey: string) => void
  /** Days with something to do (e.g. visits not closed yet): a small dot under the number. */
  marks?: ReadonlySet<string>
  /** How full each day is, 0–1 (compact only): a thin bar along the bottom of its chip. */
  loads?: ReadonlyMap<string, number>
  /** `compact`: one thin line of «чт 19» capsules (the cabinet); default: weekday over number. */
  variant?: 'default' | 'compact'
}

export const DayStrip = ({
  days,
  value,
  onChange,
  marks,
  loads,
  variant = 'default',
}: DayStripProps) => {
  const t = useT()
  const daysRef = useRef<HTMLFieldSetElement>(null)
  const knobRef = useRef<HTMLSpanElement>(null)
  const today = days.find((day) => day.isToday)

  // Past days sit to the left: bring the chosen day into view, not the first one.
  useEffect(() => {
    const selected = daysRef.current?.querySelector<HTMLElement>(`[data-day="${value}"]`)
    selected?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [value])

  // The compact row's chosen fill is one knob that glides to the picked day (a spring), like the
  // segmented control's - measured and written to CSS variables, no re-render.
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
    // Not `data-today`: that names the day buttons, and a knob carrying it matched them too.
    knob.toggleAttribute('data-on-today', selected.hasAttribute('data-today'))
  }, [value, days])

  return (
    <div className={styles.strip} data-variant={variant}>
      <fieldset
        aria-label={t('День')}
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
            <span className={styles.weekday}>{t.weekdayShort(day.key)}</span>
            <span className={styles.number}>{day.dayOfMonth}</span>
            {marks?.has(day.key) && <CircleDashed className={styles.markGlyph} aria-hidden />}
            {variant === 'compact' && loads?.has(day.key) && (
              <span
                className={styles.load}
                style={{ '--load': Math.min(1, loads.get(day.key) ?? 0) } as CSSProperties}
                aria-hidden='true'
              />
            )}
            {/* The full date after the visible «Сб 7», not instead of it (WCAG 2.5.3). */}
            <span className={styles.srOnly}>
              {`, ${t.language === 'ru' ? day.label : t.dayLong(day.key)}${
                marks?.has(day.key) ? `, ${t('есть незакрытые визиты')}` : ''
              }${
                loads?.has(day.key)
                  ? `, ${t('занято на {percent}%', {
                      percent: Math.round(Math.min(1, loads.get(day.key) ?? 0) * 100),
                    })}`
                  : ''
              }`}
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
          {t('Сегодня')}
        </button>
      )}
    </div>
  )
}
