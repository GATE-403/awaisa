'use client'

import { Select } from '@awaisa/ui/Select'
import { useState } from 'react'
import { type Translate, useT } from '@/shared/i18n'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './ClientSheet.module.css'

interface BirthdayFieldProps {
  /** `YYYY-MM-DD`; the year `NO_YEAR` means the day and month only. */
  value: string
  onChange: (value: string) => void
}

// People rarely know a client's year of birth: like Contacts, a birthday without one is kept on a
// leap year nobody is born in, so 29 February still fits and greetings only read month and day.
const NO_YEAR = '1904'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const pad = (value: number) => String(value).padStart(2, '0')

const daysIn = (month: number, year: string) =>
  new Date(Date.UTC(Number(year === NO_YEAR ? 2024 : year), month, 0)).getUTCDate()

const parse = (value: string) => {
  // An empty value splits into [''], so the year needs its own fallback, not a default.
  const [year, month = '', day = ''] = value.split('-')
  return { year: year || NO_YEAR, month: Number(month) || null, day: Number(day) || null }
}

/** «14 March». */
const formatDayMonth = (day: number, month: number, t: Translate) =>
  `${day} ${t(MONTH_NAMES[month - 1] ?? '')}`

/** «November 2026». */
const formatMonthYear = (month: number, year: number, t: Translate) =>
  `${t(MONTH_NAMES[month - 1] ?? '')} ${year}`

const bishkekParts = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
})

/** A moment's day, month and year on Bishkek's clock. */
const getBishkekDate = (iso: string) => {
  const parts = bishkekParts.formatToParts(new Date(iso))
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0)
  return { day: part('day'), month: part('month'), year: part('year') }
}

/** «21 ноября» · «21-ноябрь» · «21 November» for a moment (an ISO timestamp). */
const formatMomentDay = (iso: string, t: Translate) => {
  const { day, month } = getBishkekDate(iso)
  return formatDayMonth(day, month, t)
}

const describeBirthday = (value: string, t: Translate) => {
  const { year, month, day } = parse(value)
  if (!month || !day) return null
  return `${formatDayMonth(day, month, t)}${year === NO_YEAR ? '' : ` ${year}`}`
}

// The row reads the birthday as words; a tap opens day · month · year (optional) pickers in place.
const BirthdayField = ({ value, onChange }: BirthdayFieldProps) => {
  const t = useT()
  const [isEditing, setIsEditing] = useState(false)
  const parsed = parse(value)
  const thisYear = new Date().getFullYear()
  const dayItems = Array.from({ length: daysIn(parsed.month ?? 1, parsed.year) }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  }))
  const monthItems = MONTH_NAMES.map((label, index) => ({ value: index + 1, label: t(label) }))
  const yearItems = [
    { value: NO_YEAR, label: t('Year not needed') },
    ...Array.from({ length: 90 }, (_, index) => {
      const year = String(thisYear - 10 - index)
      return { value: year, label: year }
    }),
  ]

  const update = (patch: Partial<{ year: string; month: number; day: number }>) => {
    const next = { year: parsed.year, month: parsed.month ?? 1, day: parsed.day ?? 1, ...patch }
    const day = Math.min(next.day, daysIn(next.month, next.year))
    onChange(`${next.year}-${pad(next.month)}-${pad(day)}`)
  }

  const label = describeBirthday(value, t)

  return (
    <>
      <div className={sheet.row}>
        <span className={sheet.rowLabel}>{t('Birthday')}</span>
        <span className={styles.birthdayValue}>
          {label && !isEditing && <span>{label}</span>}
          <button
            type='button'
            className={styles.linkButton}
            aria-expanded={isEditing}
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? t('Done') : label ? t('Change') : t('Add')}
          </button>
        </span>
      </div>
      {isEditing && (
        <div className={styles.birthdayPickers}>
          <span>
            <Select
              aria-label={t('Day')}
              className={styles.picker}
              items={dayItems}
              value={parsed.day}
              placeholder={t('Day')}
              onValueChange={(day) => day && update({ day })}
            />
          </span>
          <span>
            <Select
              aria-label={t('Month')}
              className={styles.picker}
              items={monthItems}
              value={parsed.month}
              placeholder={t('Month')}
              onValueChange={(month) => month && update({ month })}
            />
          </span>
          <span>
            <Select
              aria-label={t('Year')}
              className={styles.picker}
              items={yearItems}
              value={value ? parsed.year : null}
              placeholder={t('Year')}
              onValueChange={(year) => year && update({ year })}
            />
          </span>
          {value && (
            <button
              type='button'
              className={styles.linkButton}
              data-tone='danger'
              onClick={() => {
                onChange('')
                setIsEditing(false)
              }}
            >
              {t('Remove')}
            </button>
          )}
        </div>
      )}
    </>
  )
}

export {
  BirthdayField,
  describeBirthday,
  formatDayMonth,
  formatMomentDay,
  formatMonthYear,
  getBishkekDate,
}
