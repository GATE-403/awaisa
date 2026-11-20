import { Button } from '@awaisa/ui/Button'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import { findDay, formatClock, parseClock, TIME_OPTIONS, WEEKDAYS_FULL } from '@/entities/business'
import { setWorkingHours, updateBusiness } from '@/shared/api/clientApi'
import type { Business, WorkingDay } from '@/shared/api/types'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import styles from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'

interface HoursTabProps {
  slug: string
  business: Business
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

type DayDraft = { isOpen: boolean; from: string; to: string }

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
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
  const hasChanges =
    slotMinutes !== business.slotMinutes ||
    JSON.stringify(days) !== JSON.stringify(toDrafts(business.hours))

  const updateDay = (weekday: number, patch: Partial<DayDraft>) =>
    setDays((current) =>
      current.map((day, index) => (index === weekday ? { ...day, ...patch } : day)),
    )

  const handleReset = () => {
    setDays(toDrafts(business.hours))
    setSlotMinutes(business.slotMinutes)
  }

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
    <form className={styles.section} onSubmit={handleSubmit} aria-label='График'>
      <SectionHeader
        title='График'
        description='Клиенты видят только время внутри графика и без чужих записей.'
      />

      <div className={styles.group}>
        <SectionCaption>Часы работы</SectionCaption>
        {/* Settings rows: the day on the left, its hours as plain pop-up values and the switch on
            the right, like iOS. */}
        <ul className={styles.list}>
          {days.map((day, weekday) => (
            <li key={WEEKDAYS_FULL[weekday]} className={styles.hoursRow}>
              <span className={styles.dayName}>
                <span className={styles.dayFull}>{WEEKDAYS_FULL[weekday]}</span>
                <span className={styles.dayShort} aria-hidden='true'>
                  {WEEKDAYS_SHORT[weekday]}
                </span>
              </span>
              {day.isOpen ? (
                <span className={styles.timeRange}>
                  <Select
                    variant='plain'
                    aria-label={`${WEEKDAYS_FULL[weekday]}: открытие`}
                    items={TIME_ITEMS}
                    value={day.from}
                    onValueChange={(value) => value && updateDay(weekday, { from: value })}
                  />
                  <span className={styles.dash} aria-hidden='true'>
                    –
                  </span>
                  <Select
                    variant='plain'
                    aria-label={`${WEEKDAYS_FULL[weekday]}: закрытие`}
                    items={TIME_ITEMS}
                    value={day.to}
                    onValueChange={(value) => value && updateDay(weekday, { to: value })}
                  />
                </span>
              ) : (
                <span className={styles.cellMuted}>Выходной</span>
              )}
              <Switch
                aria-label={`${WEEKDAYS_FULL[weekday]}: рабочий день`}
                checked={day.isOpen}
                onCheckedChange={(isOpen) => updateDay(weekday, { isOpen })}
              />
            </li>
          ))}
        </ul>
        {invalidDay !== -1 && (
          <p className={styles.fieldError} role='alert'>
            {WEEKDAYS_FULL[invalidDay]}: закрытие должно быть позже открытия
          </p>
        )}
      </div>

      <div className={styles.group}>
        <SectionCaption>Запись</SectionCaption>
        <div className={styles.list}>
          <div className={styles.settingRow}>
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>Шаг записи</span>
              <span className={styles.rowMeta}>Как часто начинаются слоты: 10:00, 10:30…</span>
            </span>
            <Select
              variant='plain'
              aria-label='Шаг записи'
              items={STEPS}
              value={slotMinutes}
              onValueChange={(value) => value && setSlotMinutes(value)}
            />
          </div>
        </div>
      </div>

      {/* The cabinet's one way to save: the floating bar, only while something changed. */}
      {hasChanges && (
        <section className={styles.saveBar} aria-label='Несохранённые изменения'>
          <span className={styles.saveText}>Есть несохранённые изменения</span>
          <Button type='button' variant='secondary' size='sm' onClick={handleReset}>
            Отменить
          </Button>
          <Button type='submit' size='sm' disabled={isSaving || invalidDay !== -1}>
            Сохранить
          </Button>
        </section>
      )}
    </form>
  )
}
