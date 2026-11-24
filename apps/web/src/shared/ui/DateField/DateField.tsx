'use client'

import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { X } from '@phosphor-icons/react/ssr'
import type { MouseEvent } from 'react'
import { formatDate, type Locale, useLocale } from '@/shared/i18n'
import styles from './DateField.module.css'

interface DateFieldProps {
  /** YYYY-MM-DD, or '' for none. */
  value: string
  onChange: (value: string) => void
  /** Read to screen readers and shown nowhere else (the row says it). */
  label: string
  /** What an empty field says: «No end date», «Choose». */
  placeholder?: string
  min?: string
  max?: string
  /** An optional date: a small × takes it away again. */
  isClearable?: boolean
  id?: string
}

// A day key is a local date: read it as one, never through a time zone.
const toWords = (value: string, locale: Locale) => {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number)
  // «31 December 2026».
  return formatDate(locale, new Date(Date.UTC(year, month - 1, day, 12)), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// A date in a Settings row as words («25 December 2026», «No end date»), the system's own date
// picker under it: the browser's «dd/mm/yyyy» segments and its calendar glyph never show
// (the owner: the date component had problems). A tap anywhere on it opens the picker.
export const DateField = ({
  value,
  onChange,
  label,
  placeholder,
  min,
  max,
  isClearable = false,
  id,
}: DateFieldProps) => {
  const { t } = useLingui()
  const locale = useLocale()
  const openPicker = (event: MouseEvent<HTMLInputElement>) => {
    try {
      event.currentTarget.showPicker?.()
    } catch {
      // Browsers without `showPicker` open their own picker on the tap anyway.
    }
  }

  return (
    <span className={styles.field}>
      <span className={styles.text} data-empty={!value || undefined} aria-hidden='true'>
        {value ? toWords(value, locale) : (placeholder ?? t`Choose`)}
      </span>
      <input
        id={id}
        type='date'
        className={styles.native}
        aria-label={label}
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        onClick={openPicker}
      />
      {isClearable && value && (
        <button
          type='button'
          className={styles.clear}
          aria-label={t`${ph({ label })}: remove the date`}
          onClick={() => onChange('')}
        >
          <X aria-hidden />
        </button>
      )}
    </span>
  )
}
