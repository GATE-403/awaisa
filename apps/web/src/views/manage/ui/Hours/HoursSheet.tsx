'use client'

import { Select } from '@awaisa/ui/Select'
import { type FormEvent, useState } from 'react'
import { setWorkingHours, updateBusiness } from '@/shared/api/clientApi'
import type { WorkingDay } from '@/shared/api/types'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { type DayDraft, findInvalidDay, toDrafts, toHours, WeekHoursRows } from './WeekHoursRows'

interface HoursSheetProps {
  slug: string
  hours: WorkingDay[]
  /** How often slots start: 15, 30 or 60 minutes. */
  slotMinutes: number
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
  onClose: () => void
}

const FORM_ID = 'hours-sheet'
const STEPS = [15, 30, 60].map((value) => ({ value, label: `${value} мин` }))

// The week's hours and the slot step, changed where they are shown (the page's «Время»).
export const HoursSheet = ({ slug, hours, slotMinutes, run, onClose }: HoursSheetProps) => {
  const [days, setDays] = useState(() => toDrafts(hours))
  const [step, setStep] = useState(slotMinutes)
  const [isSaving, setIsSaving] = useState(false)
  const hasChanges =
    step !== slotMinutes || JSON.stringify(days) !== JSON.stringify(toDrafts(hours))
  const canSave = hasChanges && findInvalidDay(days) === -1 && !isSaving

  const updateDay = (weekday: number, patch: Partial<DayDraft>) =>
    setDays((current) =>
      current.map((day, index) => (index === weekday ? { ...day, ...patch } : day)),
    )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    setIsSaving(true)
    const isSaved = await run(async () => {
      await setWorkingHours(slug, toHours(days))
      if (step !== slotMinutes) await updateBusiness(slug, { slotMinutes: step })
    }, 'Часы сохранены')
    setIsSaving(false)
    if (isSaved) onClose()
  }

  return (
    <Sheet
      title='Часы работы'
      onClose={onClose}
      action={{ label: 'Готово', form: FORM_ID, disabled: !canSave }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label='Часы работы'>
          <WeekHoursRows days={days} onChange={updateDay} />
          <p className={sheet.groupFooter}>
            Клиенты видят только время внутри этих часов и без чужих записей.
          </p>
        </section>

        <section className={sheet.group} aria-label='Запись'>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Шаг записи</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label='Шаг записи'
                  items={STEPS}
                  value={step}
                  onValueChange={(value) => value && setStep(value)}
                />
              </span>
            </div>
          </div>
          <p className={sheet.groupFooter}>Как часто начинаются окна: 10:00, 10:30…</p>
        </section>
      </form>
    </Sheet>
  )
}
