'use client'

import { Select } from '@awaisa/ui/Select'
import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import type { Translate } from '@/shared/i18n'
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
  msg`January`,
  msg`February`,
  msg`March`,
  msg`April`,
  msg`May`,
  msg`June`,
  msg`July`,
  msg`August`,
  msg`September`,
  msg`October`,
  msg`November`,
  msg`December`,
]

// One message per month, so each language can say the day its own way ("14 марта").
const DAY_MONTH: ((day: number) => MessageDescriptor)[] = [
  (day) => msg`${day} January`,
  (day) => msg`${day} February`,
  (day) => msg`${day} March`,
  (day) => msg`${day} April`,
  (day) => msg`${day} May`,
  (day) => msg`${day} June`,
  (day) => msg`${day} July`,
  (day) => msg`${day} August`,
  (day) => msg`${day} September`,
  (day) => msg`${day} October`,
  (day) => msg`${day} November`,
  (day) => msg`${day} December`,
]

const MONTH_YEAR: ((year: number) => MessageDescriptor)[] = [
  (year) => msg`January ${year}`,
  (year) => msg`February ${year}`,
  (year) => msg`March ${year}`,
  (year) => msg`April ${year}`,
  (year) => msg`May ${year}`,
  (year) => msg`June ${year}`,
  (year) => msg`July ${year}`,
  (year) => msg`August ${year}`,
  (year) => msg`September ${year}`,
  (year) => msg`October ${year}`,
  (year) => msg`November ${year}`,
  (year) => msg`December ${year}`,
]

const pad = (value: number) => String(value).padStart(2, '0')

const daysIn = (month: number, year: string) =>
  new Date(Date.UTC(Number(year === NO_YEAR ? 2024 : year), month, 0)).getUTCDate()

const parse = (value: string) => {
  // An empty value splits into [''], so the year needs its own fallback, not a default.
  const [year, month = '', day = ''] = value.split('-')
  return { year: year || NO_YEAR, month: Number(month) || null, day: Number(day) || null }
}

/** "14 March". */
const formatDayMonth = (day: number, month: number, t: Translate) => {
  const message = DAY_MONTH[month - 1]
  return message ? t(message(day)) : String(day)
}

/** "November 2026". */
const formatMonthYear = (month: number, year: number, t: Translate) => {
  const message = MONTH_YEAR[month - 1]
  return message ? t(message(year)) : String(year)
}

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

/** "21 November" for a moment (an ISO timestamp). */
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
  const { t } = useLingui()
  const [isEditing, setIsEditing] = useState(false)
  const parsed = parse(value)
  const thisYear = new Date().getFullYear()
  const dayItems = Array.from({ length: daysIn(parsed.month ?? 1, parsed.year) }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  }))
  const monthItems = MONTH_NAMES.map((label, index) => ({ value: index + 1, label: t(label) }))
  const yearItems = [
    { value: NO_YEAR, label: t`Year not needed` },
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
        <span className={sheet.rowLabel}>{t`Birthday`}</span>
        <span className={styles.birthdayValue}>
          {label && !isEditing && <span>{label}</span>}
          <button
            type='button'
            className={styles.linkButton}
            aria-expanded={isEditing}
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? t`Done` : label ? t`Change` : t`Add`}
          </button>
        </span>
      </div>
      {isEditing && (
        <div className={styles.birthdayPickers}>
          <span>
            <Select
              aria-label={t`Day`}
              className={styles.picker}
              items={dayItems}
              value={parsed.day}
              placeholder={t`Day`}
              onValueChange={(day) => day && update({ day })}
            />
          </span>
          <span>
            <Select
              aria-label={t`Month`}
              className={styles.picker}
              items={monthItems}
              value={parsed.month}
              placeholder={t`Month`}
              onValueChange={(month) => month && update({ month })}
            />
          </span>
          <span>
            <Select
              aria-label={t`Year`}
              className={styles.picker}
              items={yearItems}
              value={value ? parsed.year : null}
              placeholder={t`Year`}
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
              {t`Remove`}
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
