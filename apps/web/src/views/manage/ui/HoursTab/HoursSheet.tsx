'use client'

import { type FormEvent, useState } from 'react'
import { setWorkingHours } from '@/shared/api/clientApi'
import type { WorkingDay } from '@/shared/api/types'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { type DayDraft, findInvalidDay, toDrafts, toHours, WeekHoursRows } from './WeekHoursRows'

interface HoursSheetProps {
  slug: string
  hours: WorkingDay[]
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
  onClose: () => void
}

const FORM_ID = 'hours-sheet'

// The week's hours changed where they are shown (the page's «Время»), not in the settings.
export const HoursSheet = ({ slug, hours, run, onClose }: HoursSheetProps) => {
  const [days, setDays] = useState(() => toDrafts(hours))
  const [isSaving, setIsSaving] = useState(false)
  const hasChanges = JSON.stringify(days) !== JSON.stringify(toDrafts(hours))
  const canSave = hasChanges && findInvalidDay(days) === -1 && !isSaving

  const updateDay = (weekday: number, patch: Partial<DayDraft>) =>
    setDays((current) =>
      current.map((day, index) => (index === weekday ? { ...day, ...patch } : day)),
    )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    setIsSaving(true)
    const isSaved = await run(() => setWorkingHours(slug, toHours(days)), 'Часы сохранены')
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
      </form>
    </Sheet>
  )
}
