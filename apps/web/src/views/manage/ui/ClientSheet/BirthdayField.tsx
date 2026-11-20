'use client'

import { Select } from '@awaisa/ui/Select'
import { useState } from 'react'
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

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]
const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

const pad = (value: number) => String(value).padStart(2, '0')

const daysIn = (month: number, year: string) =>
  new Date(Date.UTC(Number(year === NO_YEAR ? 2024 : year), month, 0)).getUTCDate()

const parse = (value: string) => {
  const [year = NO_YEAR, month = '', day = ''] = value.split('-')
  return { year, month: Number(month) || null, day: Number(day) || null }
}

const describeBirthday = (value: string) => {
  const { year, month, day } = parse(value)
  if (!month || !day) return null
  return `${day} ${MONTHS[month - 1]}${year === NO_YEAR ? '' : ` ${year}`}`
}

// The row reads the birthday as words; a tap opens day · month · year (optional) pickers in place.
const BirthdayField = ({ value, onChange }: BirthdayFieldProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const parsed = parse(value)
  const thisYear = new Date().getFullYear()
  const dayItems = Array.from({ length: daysIn(parsed.month ?? 1, parsed.year) }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  }))
  const monthItems = MONTH_NAMES.map((label, index) => ({ value: index + 1, label }))
  const yearItems = [
    { value: NO_YEAR, label: 'Год не важен' },
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

  const label = describeBirthday(value)

  return (
    <>
      <div className={sheet.row}>
        <span className={sheet.rowLabel}>День рождения</span>
        <span className={styles.birthdayValue}>
          {label && !isEditing && <span>{label}</span>}
          <button
            type='button'
            className={styles.linkButton}
            aria-expanded={isEditing}
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? 'Готово' : label ? 'Изменить' : 'Добавить'}
          </button>
        </span>
      </div>
      {isEditing && (
        <div className={styles.birthdayPickers}>
          <span>
            <Select
              aria-label='День'
              className={styles.picker}
              items={dayItems}
              value={parsed.day}
              placeholder='День'
              onValueChange={(day) => day && update({ day })}
            />
          </span>
          <span>
            <Select
              aria-label='Месяц'
              className={styles.picker}
              items={monthItems}
              value={parsed.month}
              placeholder='Месяц'
              onValueChange={(month) => month && update({ month })}
            />
          </span>
          <span>
            <Select
              aria-label='Год'
              className={styles.picker}
              items={yearItems}
              value={value ? parsed.year : null}
              placeholder='Год'
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
              Убрать
            </button>
          )}
        </div>
      )}
    </>
  )
}

export { BirthdayField, describeBirthday }
