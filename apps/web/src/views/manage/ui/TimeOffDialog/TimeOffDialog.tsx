import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { type FormEvent, useState } from 'react'
import { TIME_OPTIONS } from '@/entities/business'
import type { CreateTimeOffInput, Specialist } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'

interface TimeOffDialogProps {
  date: string
  dayLabel: string
  specialists: Pick<Specialist, 'id' | 'name'>[]
  onClose: () => void
  onSubmit: (input: CreateTimeOffInput) => Promise<boolean>
}

const FORM_ID = 'time-off-form'

const toItems = (values: string[]) => values.map((value) => ({ value, label: value }))

export const TimeOffDialog = ({
  date,
  dayLabel,
  specialists,
  onClose,
  onSubmit,
}: TimeOffDialogProps) => {
  const t = useT()
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
    <Sheet
      title={t('Закрыть время')}
      onClose={onClose}
      action={{ label: t('Готово'), form: FORM_ID, disabled: isSubmitting || !isRangeValid }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <section className={sheet.group} aria-label={t('Время')}>
          <SectionCaption>{dayLabel}</SectionCaption>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Мастер')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Мастер')}
                  items={specialists.map(({ id, name }) => ({ value: id, label: name }))}
                  value={specialistId}
                  onValueChange={(value) => value && setSpecialistId(value)}
                />
              </span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Начало')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Начало')}
                  items={toItems(TIME_OPTIONS.slice(0, -1))}
                  value={from}
                  onValueChange={(value) => value && setFrom(value)}
                />
              </span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Конец')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Конец')}
                  items={toItems(TIME_OPTIONS.slice(1))}
                  value={to}
                  onValueChange={(value) => value && setTo(value)}
                />
              </span>
            </div>
          </div>
          <p className={sheet.groupFooter}>
            {isRangeValid
              ? t('Перерыв, обучение или выходной - клиенты не смогут записаться на это время.')
              : t('Конец должен быть позже начала.')}
          </p>
        </section>
        <div className={sheet.list}>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label={t('Причина')}
              placeholder={t('Причина - необязательно')}
              value={reason}
              onValueChange={setReason}
              maxLength={160}
            />
          </div>
        </div>
      </form>
    </Sheet>
  )
}
