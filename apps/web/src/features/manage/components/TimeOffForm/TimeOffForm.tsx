import { Button } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { type FormEvent, useState } from 'react'
import type { CreateTimeOffInput, Specialist } from '@/common/api/types'
import { TIME_OPTIONS } from '../../manageUtils'
import styles from './TimeOffForm.module.css'

interface TimeOffFormProps {
  date: string
  specialists: Pick<Specialist, 'id' | 'name'>[]
  onSubmit: (input: CreateTimeOffInput) => Promise<void>
}

const DEFAULT_FROM = '13:00'
const DEFAULT_TO = '14:00'

const toItems = (values: string[]) => values.map((value) => ({ value, label: value }))

export const TimeOffForm = ({ date, specialists, onSubmit }: TimeOffFormProps) => {
  const [specialistId, setSpecialistId] = useState<string | null>(null)
  const [from, setFrom] = useState(DEFAULT_FROM)
  const [to, setTo] = useState(DEFAULT_TO)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const selectedId = specialistId ?? specialists[0]?.id ?? ''
  const isRangeValid = from < to

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId || !isRangeValid) return

    setIsSubmitting(true)
    await onSubmit({ specialistId: selectedId, date, from, to, reason: reason.trim() })
    setIsSubmitting(false)
    setReason('')
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-labelledby='time-off-title'>
      <h2 id='time-off-title' className={styles.title}>
        Закрыть время
      </h2>
      <p className={styles.hint}>Перерыв, обучение или выходной — клиенты не смогут записаться.</p>
      <Field label='Мастер'>
        <Select
          aria-label='Мастер'
          items={specialists.map(({ id, name }) => ({ value: id, label: name }))}
          value={selectedId}
          onValueChange={(value) => setSpecialistId(value)}
        />
      </Field>
      <div className={styles.range}>
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
      <Button type='submit' fullWidth disabled={isSubmitting || !isRangeValid}>
        Закрыть время
      </Button>
    </form>
  )
}
