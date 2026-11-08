import { Button } from '@awaisa/ui/Button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@awaisa/ui/Dialog'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { type FormEvent, useState } from 'react'
import type { CreateTimeOffInput, Specialist } from '@/common/api/types'
import { TIME_OPTIONS } from '../../manageUtils'
import styles from '../manageForms.module.css'

interface TimeOffDialogProps {
  date: string
  dayLabel: string
  specialists: Pick<Specialist, 'id' | 'name'>[]
  onClose: () => void
  onSubmit: (input: CreateTimeOffInput) => Promise<boolean>
}

const toItems = (values: string[]) => values.map((value) => ({ value, label: value }))

export const TimeOffDialog = ({
  date,
  dayLabel,
  specialists,
  onClose,
  onSubmit,
}: TimeOffDialogProps) => {
  const [specialistId, setSpecialistId] = useState(specialists[0]?.id ?? '')
  const [from, setFrom] = useState('13:00')
  const [to, setTo] = useState('14:00')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRangeValid = from < to

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!specialistId || !isRangeValid) return

    setIsSubmitting(true)
    const saved = await onSubmit({ specialistId, date, from, to, reason: reason.trim() })
    setIsSubmitting(false)
    if (saved) onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Закрыть время</DialogTitle>
        <DialogDescription>
          {dayLabel}. Перерыв, обучение или выходной — клиенты не смогут записаться.
        </DialogDescription>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label='Мастер'>
            <Select
              aria-label='Мастер'
              items={specialists.map(({ id, name }) => ({ value: id, label: name }))}
              value={specialistId}
              onValueChange={(value) => value && setSpecialistId(value)}
            />
          </Field>
          <div className={styles.pair}>
            <Field label='С'>
              <Select
                aria-label='С'
                items={toItems(TIME_OPTIONS.slice(0, -1))}
                value={from}
                onValueChange={(value) => value && setFrom(value)}
              />
            </Field>
            <Field label='До' error={isRangeValid ? undefined : 'Позже начала'}>
              <Select
                aria-label='До'
                items={toItems(TIME_OPTIONS.slice(1))}
                value={to}
                onValueChange={(value) => value && setTo(value)}
              />
            </Field>
          </div>
          <Field label='Причина'>
            <Input
              value={reason}
              onValueChange={setReason}
              placeholder='Необязательно'
              maxLength={160}
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant='secondary' />}>Отмена</DialogClose>
            <Button type='submit' disabled={isSubmitting || !isRangeValid}>
              Закрыть время
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
