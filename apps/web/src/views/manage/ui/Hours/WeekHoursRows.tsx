'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import type { MessageDescriptor } from '@lingui/core'
import { msg, ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { findDay, formatClock, parseClock, TIME_OPTIONS } from '@/entities/business'
import type { WorkingDay } from '@/shared/api/types'
import styles from '@/views/manage/ui/manageForms.module.css'

type DayDraft = { isOpen: boolean; from: string; to: string }

interface WeekHoursRowsProps {
  days: DayDraft[]
  onChange: (weekday: number, patch: Partial<DayDraft>) => void
}

// Monday first, like the API's weekday 0.
const WEEKDAYS: { key: string; name: MessageDescriptor; short: MessageDescriptor }[] = [
  { key: 'mon', name: msg`Monday`, short: msg`Mon` },
  { key: 'tue', name: msg`Tuesday`, short: msg`Tue` },
  { key: 'wed', name: msg`Wednesday`, short: msg`Wed` },
  { key: 'thu', name: msg`Thursday`, short: msg`Thu` },
  { key: 'fri', name: msg`Friday`, short: msg`Fri` },
  { key: 'sat', name: msg`Saturday`, short: msg`Sat` },
  { key: 'sun', name: msg`Sunday`, short: msg`Sun` },
]
const TIME_ITEMS = TIME_OPTIONS.map((time) => ({ value: time, label: time }))

const toDrafts = (hours: WorkingDay[]): DayDraft[] =>
  WEEKDAYS.map((_, weekday) => {
    const day = findDay(hours, weekday)
    return day
      ? { isOpen: true, from: formatClock(day.opensMinutes), to: formatClock(day.closesMinutes) }
      : { isOpen: false, from: '10:00', to: '20:00' }
  })

const toHours = (days: DayDraft[]): WorkingDay[] =>
  days.flatMap((day, weekday) =>
    day.isOpen
      ? [{ weekday, opensMinutes: parseClock(day.from), closesMinutes: parseClock(day.to) }]
      : [],
  )

/** The first day whose closing is not after its opening, or -1. */
const findInvalidDay = (days: DayDraft[]) =>
  days.findIndex((day) => day.isOpen && day.from >= day.to)

// The week as Settings rows: the day on the left, its hours as plain pop-up values and the switch
// on the right, like iOS. One editor for "Hours" in the settings and the page's "Hours" sheet.
export const WeekHoursRows = ({ days, onChange }: WeekHoursRowsProps) => {
  const { t } = useLingui()
  const invalidDay = findInvalidDay(days)
  const dayName = (weekday: number) => {
    const name = WEEKDAYS[weekday]?.name
    return name ? t(name) : ''
  }
  const invalidName = dayName(invalidDay)

  return (
    <>
      <ul className={styles.list}>
        {days.map((day, weekday) => {
          const name = dayName(weekday)
          const short = WEEKDAYS[weekday]?.short
          return (
            <li key={WEEKDAYS[weekday]?.key ?? weekday} className={styles.hoursRow}>
              <span className={styles.dayName}>
                <span className={styles.dayFull}>{name}</span>
                <span className={styles.dayShort} aria-hidden='true'>
                  {short ? t(short) : ''}
                </span>
              </span>
              {day.isOpen ? (
                <span className={styles.timeRange}>
                  <Select
                    variant='plain'
                    aria-label={t`${ph({ day: name })}: opens`}
                    items={TIME_ITEMS}
                    value={day.from}
                    onValueChange={(value) => value && onChange(weekday, { from: value })}
                  />
                  <span className={styles.dash} aria-hidden='true'>
                    –
                  </span>
                  <Select
                    variant='plain'
                    aria-label={t`${ph({ day: name })}: closes`}
                    items={TIME_ITEMS}
                    value={day.to}
                    onValueChange={(value) => value && onChange(weekday, { to: value })}
                  />
                </span>
              ) : (
                <span className={styles.cellMuted}>{t`Closed`}</span>
              )}
              <Switch
                aria-label={t`${ph({ day: name })}: working day`}
                checked={day.isOpen}
                onCheckedChange={(isOpen) => onChange(weekday, { isOpen })}
              />
            </li>
          )
        })}
      </ul>
      {invalidDay !== -1 && (
        <p className={styles.fieldError} role='alert'>
          {t`${ph({ day: invalidName })}: closing must be after opening`}
        </p>
      )}
    </>
  )
}

export type { DayDraft }
export { findInvalidDay, toDrafts, toHours }
