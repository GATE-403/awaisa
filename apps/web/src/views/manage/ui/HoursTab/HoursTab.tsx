import { Button } from '@awaisa/ui/Button'
import { Select } from '@awaisa/ui/Select'
import { type FormEvent, useState } from 'react'
import { setWorkingHours, updateBusiness } from '@/shared/api/clientApi'
import type { Business } from '@/shared/api/types'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import styles from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { type DayDraft, findInvalidDay, toDrafts, toHours, WeekHoursRows } from './WeekHoursRows'

interface HoursTabProps {
  slug: string
  business: Business
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

const STEPS = [15, 30, 60].map((value) => ({ value, label: `${value} мин` }))

export const HoursTab = ({ slug, business, run }: HoursTabProps) => {
  const [days, setDays] = useState(() => toDrafts(business.hours))
  const [slotMinutes, setSlotMinutes] = useState(business.slotMinutes)
  const [isSaving, setIsSaving] = useState(false)
  const invalidDay = findInvalidDay(days)
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
    const hours = toHours(days)
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
        <WeekHoursRows days={days} onChange={updateDay} />
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
