import { Button } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import { setWorkingHours, updateBusiness } from '@/common/api/clientApi'
import type { Business, WorkingDay } from '@/common/api/types'
import { findDay, formatClock, parseClock, WEEKDAYS_FULL } from '@/common/utils/workingHours'
import { TIME_OPTIONS } from '../../manageUtils'
import styles from '../manageForms.module.css'

interface HoursTabProps {
  slug: string
  business: Business
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

type DayDraft = { isOpen: boolean; from: string; to: string }

const STEPS = [15, 30, 60].map((value) => ({ value, label: `${value} мин` }))
const TIME_ITEMS = TIME_OPTIONS.map((time) => ({ value: time, label: time }))

const toDrafts = (hours: WorkingDay[]): DayDraft[] =>
  WEEKDAYS_FULL.map((_, weekday) => {
    const day = findDay(hours, weekday)
    return day
      ? { isOpen: true, from: formatClock(day.opensMinutes), to: formatClock(day.closesMinutes) }
      : { isOpen: false, from: '10:00', to: '20:00' }
  })

export const HoursTab = ({ slug, business, run }: HoursTabProps) => {
  const [days, setDays] = useState(() => toDrafts(business.hours))
  const [slotMinutes, setSlotMinutes] = useState(business.slotMinutes)
  const [isSaving, setIsSaving] = useState(false)
  const invalidDay = days.findIndex((day) => day.isOpen && day.from >= day.to)

  const updateDay = (weekday: number, patch: Partial<DayDraft>) =>
    setDays((current) =>
      current.map((day, index) => (index === weekday ? { ...day, ...patch } : day)),
    )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (invalidDay !== -1) return

    setIsSaving(true)
    const hours = days.flatMap((day, weekday) =>
      day.isOpen
        ? [{ weekday, opensMinutes: parseClock(day.from), closesMinutes: parseClock(day.to) }]
        : [],
    )
    await run(async () => {
      await setWorkingHours(slug, hours)
      if (slotMinutes !== business.slotMinutes) await updateBusiness(slug, { slotMinutes })
    }, 'График сохранён')
    setIsSaving(false)
  }

  return (
    <form className={styles.section} onSubmit={handleSubmit}>
      <p className={styles.hint}>Клиенты видят только время внутри графика и без чужих записей.</p>
      <ul className={styles.list}>
        {days.map((day, weekday) => (
          <li
            key={WEEKDAYS_FULL[weekday]}
            className={styles.row}
            data-closed={!day.isOpen || undefined}
          >
            <span className={styles.rowBody}>
              <span>{WEEKDAYS_FULL[weekday]}</span>
              {!day.isOpen && <span className={styles.rowMeta}>Выходной</span>}
              {invalidDay === weekday && (
                <span className={styles.rowMeta} role='alert'>
                  Закрытие должно быть позже открытия
                </span>
              )}
            </span>
            {day.isOpen && (
              <span className={styles.inline}>
                <Select
                  aria-label={`${WEEKDAYS_FULL[weekday]}: открытие`}
                  items={TIME_ITEMS}
                  value={day.from}
                  onValueChange={(value) => value && updateDay(weekday, { from: value })}
                />
                <Select
                  aria-label={`${WEEKDAYS_FULL[weekday]}: закрытие`}
                  items={TIME_ITEMS}
                  value={day.to}
                  onValueChange={(value) => value && updateDay(weekday, { to: value })}
                />
              </span>
            )}
            <Switch
              aria-label={`${WEEKDAYS_FULL[weekday]}: рабочий день`}
              checked={day.isOpen}
              onCheckedChange={(isOpen) => updateDay(weekday, { isOpen })}
            />
          </li>
        ))}
      </ul>
      <div className={styles.card}>
        <Field label='Шаг записи' description='Как часто начинаются слоты: 10:00, 10:30, 11:00…'>
          <Select
            aria-label='Шаг записи'
            items={STEPS}
            value={slotMinutes}
            onValueChange={(value) => value && setSlotMinutes(value)}
          />
        </Field>
      </div>
      <Button type='submit' size='lg' disabled={isSaving || invalidDay !== -1}>
        Сохранить график
      </Button>
    </form>
  )
}
