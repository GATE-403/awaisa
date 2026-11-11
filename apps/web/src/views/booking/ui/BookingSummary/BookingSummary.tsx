'use client'

import { Button } from '@awaisa/ui/Button'
import { CaretRight, CaretUp } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { formatDayLong, formatDuration, formatPrice } from '@/entities/booking'
import type { Service } from '@/shared/api/types'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import type { BookingStepId } from '@/views/booking/model/useBookingForm'
import styles from './BookingSummary.module.css'

interface BookingSummaryProps {
  variant: 'card' | 'bar'
  service?: Service
  specialistLabel: string
  dayKey: string | null
  time: string | null
  firstIncompleteStep: BookingStepId | null
  isSubmitting: boolean
  errorMessage: string | null
  onSubmit: () => void
  /** Opens a step from the summary, so a choice is changed where it was made. */
  onStepOpen?: (step: BookingStepId) => void
}

const NEXT_STEP_HINTS: Record<BookingStepId, string> = {
  service: 'Выберите услугу',
  specialist: 'Выберите мастера',
  datetime: 'Выберите время',
  contacts: 'Оставьте контакты',
}

const getButtonLabel = (firstIncompleteStep: BookingStepId | null, isSubmitting: boolean) => {
  if (isSubmitting) return 'Записываем…'
  if (firstIncompleteStep) return 'Далее'

  return 'Записаться'
}

export const BookingSummary = ({
  variant,
  service,
  specialistLabel,
  dayKey,
  time,
  firstIncompleteStep,
  isSubmitting,
  errorMessage,
  onSubmit,
  onStepOpen,
}: BookingSummaryProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const whenLabel = dayKey && time ? `${formatDayLong(dayKey)}, ${time}` : null
  const details = [
    { label: 'Услуга', value: service?.name },
    { label: 'Мастер', value: specialistLabel },
    { label: 'Когда', value: whenLabel },
    { label: 'Длительность', value: service ? formatDuration(service.durationMinutes) : null },
    { label: 'Итого', value: service ? formatPrice(service.price) : null },
  ]
  const buttonLabel = getButtonLabel(firstIncompleteStep, isSubmitting)
  const hint = firstIncompleteStep ? NEXT_STEP_HINTS[firstIncompleteStep] : whenLabel

  if (variant === 'bar') {
    return (
      <div className={styles.bar}>
        {/* Tapping the price shows everything chosen so far, without scrolling back up. */}
        <button
          type='button'
          className={styles.barInfo}
          onClick={() => setIsDetailsOpen(true)}
          aria-label='Показать, что выбрано'
        >
          <span className={styles.barPrice}>
            {service ? formatPrice(service.price) : 'Онлайн-запись'}
            <CaretUp weight='bold' aria-hidden className={styles.barCaret} />
          </span>
          <span
            className={styles.barHint}
            data-error={errorMessage ? true : undefined}
            aria-live='polite'
          >
            {errorMessage ?? hint}
          </span>
        </button>
        <Button size='lg' className={styles.barButton} onClick={onSubmit} disabled={isSubmitting}>
          {buttonLabel}
        </Button>
        {isDetailsOpen && (
          <Sheet title='Ваша запись' cancelLabel='Готово' onClose={() => setIsDetailsOpen(false)}>
            <dl className={sheet.list}>
              {details.map((item) => (
                <div key={item.label} className={sheet.row}>
                  <dt className={sheet.rowLabel}>{item.label}</dt>
                  <dd className={styles.detailValue}>{item.value || '—'}</dd>
                </div>
              ))}
            </dl>
          </Sheet>
        )}
      </div>
    )
  }

  const rows: { step: BookingStepId; label: string; value: string | null; extra?: string }[] = [
    {
      step: 'service',
      label: 'Услуга',
      value: service?.name ?? null,
      extra: service ? formatDuration(service.durationMinutes) : undefined,
    },
    { step: 'specialist', label: 'Мастер', value: specialistLabel || null },
    { step: 'datetime', label: 'Когда', value: whenLabel },
  ]

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Ваша запись</h2>
      <ul className={styles.rows}>
        {rows.map((row) => {
          const isNext = firstIncompleteStep === row.step

          return (
            <li key={row.step}>
              <button
                type='button'
                className={styles.row}
                data-next={isNext || undefined}
                onClick={() => onStepOpen?.(row.step)}
              >
                <span className={styles.rowLabel}>{row.label}</span>
                <span className={styles.rowValue}>
                  {row.value ? (
                    <>
                      {row.value}
                      {row.extra && <span className={styles.rowExtra}>{row.extra}</span>}
                    </>
                  ) : isNext ? (
                    <span className={styles.rowAction}>{NEXT_STEP_HINTS[row.step]}</span>
                  ) : (
                    <span className={styles.rowEmpty}>—</span>
                  )}
                </span>
                <CaretRight weight='bold' className={styles.rowChevron} aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
      <div className={styles.total}>
        <span>Итого</span>
        <span>{service ? formatPrice(service.price) : '—'}</span>
      </div>
      {firstIncompleteStep === 'contacts' && (
        <p className={styles.nextStep} aria-live='polite'>
          {NEXT_STEP_HINTS.contacts}
        </p>
      )}
      <Button size='lg' fullWidth onClick={onSubmit} disabled={isSubmitting}>
        {buttonLabel}
      </Button>
      {errorMessage ? (
        <p className={styles.error} role='alert'>
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
