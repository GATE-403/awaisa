'use client'

import { Button } from '@awaisa/ui/Button'
import { CaretRight } from '@phosphor-icons/react/ssr'
import { type CSSProperties, useState } from 'react'
import { formatDayLong, formatDuration, formatPrice } from '@/entities/booking'
import { BusinessTile, pickTint } from '@/entities/business'
import type { PriceQuote, Service } from '@/shared/api/types'
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
  /** The price after the best promotion, once service, day and time are known. */
  quote?: PriceQuote | null
  /** Opens a step from the summary, so a choice is changed where it was made. */
  onStepOpen?: (step: BookingStepId) => void
  /** Overrides the button's words once everything is filled («Проверить запись»). */
  submitLabel?: string
  /** The card's head: the place's cover (or its tint) with its name, like a ticket's header. */
  place?: { name: string; coverUrl: string | null }
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
  quote = null,
  place,
  submitLabel,
}: BookingSummaryProps) => {
  const total = quote?.total ?? service?.price ?? null
  const discount = quote?.discount ?? null
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const whenLabel = dayKey && time ? `${formatDayLong(dayKey)}, ${time}` : null
  const details = [
    { label: 'Услуга', value: service?.name },
    { label: 'Мастер', value: specialistLabel },
    { label: 'Когда', value: whenLabel },
    { label: 'Длительность', value: service ? formatDuration(service.durationMinutes) : null },
    ...(discount
      ? [{ label: `Скидка «${discount.title}»`, value: `−${formatPrice(discount.amount)}` }]
      : []),
    { label: 'Итого', value: total !== null ? formatPrice(total) : null },
    ...(service?.deposit
      ? [{ label: 'Предоплата', value: `${formatPrice(service.deposit)} картой при записи` }]
      : []),
  ]
  const buttonLabel =
    (!isSubmitting && submitLabel) || getButtonLabel(firstIncompleteStep, isSubmitting)
  const hint = firstIncompleteStep
    ? NEXT_STEP_HINTS[firstIncompleteStep]
    : service?.deposit
      ? `${whenLabel} · предоплата ${formatPrice(service.deposit)}`
      : whenLabel

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
            {total !== null ? formatPrice(total) : 'Онлайн-запись'}
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
      {place && (
        <div
          className={styles.cardCover}
          style={{ '--tint': pickTint(place.name) } as CSSProperties}
          aria-hidden
        >
          {place.coverUrl && (
            // biome-ignore lint/performance/noImgElement: covers are resized already
            <img src={place.coverUrl} alt='' className={styles.cardCoverImage} />
          )}
          <span className={styles.cardPlace}>
            <BusinessTile name={place.name} size='xs' />
            {place.name}
          </span>
        </div>
      )}
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
      {discount && service && (
        <div className={styles.discount}>
          <span>
            {discount.title} · −{discount.percent}%
          </span>
          <span>−{formatPrice(discount.amount)}</span>
        </div>
      )}
      <div className={styles.total}>
        <span>Итого</span>
        <span>
          {discount && service && <s className={styles.oldPrice}>{formatPrice(service.price)}</s>}
          {total !== null ? formatPrice(total) : '—'}
        </span>
      </div>
      {/* Said before the click: the deposit is paid right after, the rest at the salon. */}
      {service?.deposit ? (
        <p className={styles.deposit}>
          Предоплата {formatPrice(service.deposit)} — картой сразу после записи, остальное в салоне.
          Вернём при отмене за сутки.
        </p>
      ) : null}
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
