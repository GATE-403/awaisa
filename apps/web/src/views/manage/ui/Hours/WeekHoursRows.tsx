'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { findDay, formatClock, parseClock, TIME_OPTIONS, WEEKDAYS_FULL } from '@/entities/business'
import type { WorkingDay } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import styles from '@/views/manage/ui/manageForms.module.css'

type DayDraft = { isOpen: boolean; from: string; to: string }

interface WeekHoursRowsProps {
  days: DayDraft[]
  onChange: (weekday: number, patch: Partial<DayDraft>) => void
}

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIME_ITEMS = TIME_OPTIONS.map((time) => ({ value: time, label: time }))

const toDrafts = (hours: WorkingDay[]): DayDraft[] =>
  WEEKDAYS_FULL.map((_, weekday) => {
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
// on the right, like iOS. One editor for «График» in the settings and the page's «Время» sheet.
export const WeekHoursRows = ({ days, onChange }: WeekHoursRowsProps) => {
  const t = useT()
  const invalidDay = findInvalidDay(days)

  return (
    <>
      <ul className={styles.list}>
        {days.map((day, weekday) => (
          <li key={WEEKDAYS_FULL[weekday]} className={styles.hoursRow}>
            <span className={styles.dayName}>
              <span className={styles.dayFull}>{t(WEEKDAYS_FULL[weekday] ?? '')}</span>
              <span className={styles.dayShort} aria-hidden='true'>
                {t(WEEKDAYS_SHORT[weekday] ?? '')}
              </span>
            </span>
            {day.isOpen ? (
              <span className={styles.timeRange}>
                <Select
                  variant='plain'
                  aria-label={t('{day}: opens', { day: t(WEEKDAYS_FULL[weekday] ?? '') })}
                  items={TIME_ITEMS}
                  value={day.from}
                  onValueChange={(value) => value && onChange(weekday, { from: value })}
                />
                <span className={styles.dash} aria-hidden='true'>
                  –
                </span>
                <Select
                  variant='plain'
                  aria-label={t('{day}: closes', { day: t(WEEKDAYS_FULL[weekday] ?? '') })}
                  items={TIME_ITEMS}
                  value={day.to}
                  onValueChange={(value) => value && onChange(weekday, { to: value })}
                />
              </span>
            ) : (
              <span className={styles.cellMuted}>{t('Closed')}</span>
            )}
            <Switch
              aria-label={t('{day}: working day', { day: t(WEEKDAYS_FULL[weekday] ?? '') })}
              checked={day.isOpen}
              onCheckedChange={(isOpen) => onChange(weekday, { isOpen })}
            />
          </li>
        ))}
      </ul>
      {invalidDay !== -1 && (
        <p className={styles.fieldError} role='alert'>
          {t('{day}: closing must be after opening', {
            day: t(WEEKDAYS_FULL[invalidDay] ?? ''),
          })}
        </p>
      )}
    </>
  )
}

export type { DayDraft }
export { findInvalidDay, toDrafts, toHours }
