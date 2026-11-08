import { Button } from '@awaisa/ui/Button'
import type { Service } from '@/common/api/types'
import { formatDayLong, formatDuration, formatPrice } from '../../bookingUtils'
import type { BookingStepId } from '../../hooks/useBookingForm'
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
}: BookingSummaryProps) => {
  const whenLabel = dayKey && time ? `${formatDayLong(dayKey)}, ${time}` : null
  const buttonLabel = getButtonLabel(firstIncompleteStep, isSubmitting)
  const hint = firstIncompleteStep ? NEXT_STEP_HINTS[firstIncompleteStep] : whenLabel

  if (variant === 'bar') {
    return (
      <div className={styles.bar}>
        <div className={styles.barInfo}>
          <span className={styles.barPrice}>
            {service ? formatPrice(service.price) : 'Онлайн-запись'}
          </span>
          <span
            className={styles.barHint}
            data-error={errorMessage ? true : undefined}
            aria-live='polite'
          >
            {errorMessage ?? hint}
          </span>
        </div>
        <Button size='lg' onClick={onSubmit} disabled={isSubmitting}>
          {buttonLabel}
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Ваша запись</h2>
      <dl className={styles.list}>
        <div className={styles.item}>
          <dt>Услуга</dt>
          <dd>{service ? service.name : '—'}</dd>
        </div>
        <div className={styles.item}>
          <dt>Мастер</dt>
          <dd>{specialistLabel || '—'}</dd>
        </div>
        <div className={styles.item}>
          <dt>Когда</dt>
          <dd>{whenLabel ?? '—'}</dd>
        </div>
        {service && (
          <div className={styles.item}>
            <dt>Длительность</dt>
            <dd>{formatDuration(service.durationMinutes)}</dd>
          </div>
        )}
      </dl>
      <div className={styles.total}>
        <span>Итого</span>
        <span>{service ? formatPrice(service.price) : '—'}</span>
      </div>
      {firstIncompleteStep && (
        <p className={styles.nextStep} aria-live='polite'>
          {NEXT_STEP_HINTS[firstIncompleteStep]}
        </p>
      )}
      <Button size='lg' fullWidth onClick={onSubmit} disabled={isSubmitting}>
        {buttonLabel}
      </Button>
      {errorMessage ? (
        <p className={styles.error} role='alert'>
          {errorMessage}
        </p>
      ) : (
        <p className={styles.note}>Оплата в салоне. Отменить можно в «Мои записи».</p>
      )}
    </div>
  )
}
