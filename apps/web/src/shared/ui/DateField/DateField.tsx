'use client'

import { X } from '@phosphor-icons/react/ssr'
import type { MouseEvent } from 'react'
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

const formatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// A day key is a local date: read it as one, never through a time zone.
const toWords = (value: string) => {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number)
  // «31 December 2026».
  return formatter.format(new Date(year, month - 1, day))
}

// A date in a Settings row as words («25 December 2026», «No end date»), the system's own date
// picker under it: the browser's «dd/mm/yyyy» segments and its calendar glyph never show
// (the owner: the date component had problems). A tap anywhere on it opens the picker.
export const DateField = ({
  value,
  onChange,
  label,
  placeholder = 'Choose',
  min,
  max,
  isClearable = false,
  id,
}: DateFieldProps) => {
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
        {value ? toWords(value) : placeholder}
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
          aria-label={`${label}: remove the date`}
          onClick={() => onChange('')}
        >
          <X aria-hidden />
        </button>
      )}
    </span>
  )
}
