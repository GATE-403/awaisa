'use client'

import { Button } from '@awaisa/ui/Button'
import { CaretRight, CaretUp } from '@phosphor-icons/react/ssr'
import { type CSSProperties, type ReactNode, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { BusinessTile, pickTint } from '@/entities/business'
import type { PriceQuote, Service } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { RollingText } from '@/shared/ui/RollingText/RollingText'
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
  /** Where to come (the chosen branch's address): said beside «Записаться», where it is read. */
  address?: string | null
  /** The «Ваша запись» sheet shows this ticket (the cards of the stack) over the money rows. */
  ticket?: ReactNode
  /**
   * Paid by a subscription: its own (`total` null: nothing to pay, the label is said instead)
   * or one bought with the visit (`total` is its price, paid now). No discount or deposit then.
   */
  paidWith?: { label: string; total: number | null } | null
  /** What is chosen so far («Укладка · Мээрим»), said in the bar while steps remain. */
  choice?: string
  /** The master as the ready bar names them: a first name or «Любой мастер». */
  masterShort?: string | null
  /** Several branches: the ready bar says which address (with one, it is in the SMS). */
  isAddressShown?: boolean
}

// The button names the next thing to do (a bare «Далее» left people unsure that a time was still
// to be picked); the line over it says how far along they are.
const NEXT_STEP_ACTIONS: Record<BookingStepId, string> = {
  service: 'Выбрать услугу',
  specialist: 'Выбрать мастера',
  datetime: 'Выбрать время',
  contacts: 'Ввести контакты',
}

const NEXT_STEP_HINTS: Record<BookingStepId, string> = {
  service: 'Выберите услугу',
  specialist: 'Выберите мастера',
  datetime: 'Выберите время',
  contacts: 'Оставьте контакты',
}

const getButtonLabel = (
  firstIncompleteStep: BookingStepId | null,
  isSubmitting: boolean,
  t: Translate,
) => {
  if (isSubmitting) return t('Записываем…')
  if (firstIncompleteStep) return t(NEXT_STEP_ACTIONS[firstIncompleteStep])

  return t('Записаться')
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
  address = null,
  ticket,
  paidWith = null,
  choice = '',
  masterShort = null,
  isAddressShown = false,
}: BookingSummaryProps) => {
  const t = useT()
  const total = paidWith ? paidWith.total : (quote?.total ?? service?.price ?? null)
  const discount = paidWith ? null : (quote?.discount ?? null)
  const deposit = paidWith ? null : (service?.deposit ?? null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const whenLabel = dayKey && time ? `${t.dayLong(dayKey)}, ${time}` : null
  const details = [
    { label: t('Услуга'), value: service?.name },
    { label: t('Мастер'), value: specialistLabel },
    { label: t('Когда'), value: whenLabel },
    { label: t('Длительность'), value: service ? t.duration(service.durationMinutes) : null },
    ...(discount
      ? [
          {
            label: t('Скидка «{title}»', { title: discount.title }),
            value: `−${formatPrice(discount.amount)}`,
          },
        ]
      : []),
    { label: t('Итого'), value: total !== null ? formatPrice(total) : (paidWith?.label ?? null) },
    ...(paidWith ? [{ label: t('Оплата'), value: paidWith.label }] : []),
    ...(deposit
      ? [
          {
            label: t('Предоплата'),
            value: t('{amount} картой при записи', { amount: formatPrice(deposit) }),
          },
        ]
      : []),
  ]
  // With the ticket shown, only what it does not say: the discount and a deposit (its stub
  // already carries the price to pay).
  const sheetRows = ticket ? details.slice(4).filter((item) => item.label !== t('Итого')) : details
  const buttonLabel =
    (!isSubmitting && submitLabel) || getButtonLabel(firstIncompleteStep, isSubmitting, t)
  // Ready to book: when and where in one line — a place with two addresses must not be a surprise.
  const shortWhen = dayKey && time ? `${t.dayShort(dayKey)}, ${time}` : null
  // While steps remain the line says what is chosen so far, not «Шаг 2 из 4»: the step's own
  // caption above its question already counts, and two counters read as clutter.
  const hint = firstIncompleteStep ? (
    choice || place?.name || t('Онлайн-запись')
  ) : deposit ? (
    t('{when} · предоплата {amount}', {
      when: whenLabel ?? '',
      amount: formatPrice(deposit),
    })
  ) : address ? (
    // Two unbreakable parts: the line breaks between the time and the address, never inside
    // the address (a lone «7» of «мкр. Асанбай, 7» hung on the second line).
    <>
      <span className={styles.barHintPart}>{`${shortWhen} ·`}</span>{' '}
      <span className={styles.barHintPart}>{address}</span>
    </>
  ) : (
    whenLabel
  )

  // Ready to book: the day as a calendar leaf (the one on the stack's time card and the ticket),
  // then the time and the total over one quiet line, the master and where or how long.
  const isReady = !firstIncompleteStep && Boolean(dayKey && time)
  const readyLine = deposit
    ? [masterShort, t('предоплата {amount}', { amount: formatPrice(deposit) })]
        .filter(Boolean)
        .join(' · ')
    : [masterShort, isAddressShown ? address : service ? t.duration(service.durationMinutes) : null]
        .filter(Boolean)
        .join(' · ')

  if (variant === 'bar' && isReady && dayKey && time) {
    return (
      <div className={styles.bar} data-ready=''>
        {/* The leaf, the time and the total open everything chosen («Ваша запись»): ⌃ says so. */}
        <button
          type='button'
          className={styles.barInfo}
          data-ready=''
          onClick={() => setIsDetailsOpen(true)}
        >
          <span className={styles.barLeaf} aria-hidden='true'>
            <span className={styles.barLeafMonth}>{t.monthShort(dayKey)}</span>
            <span className={styles.barLeafDay}>{Number(dayKey.slice(8))}</span>
          </span>
          <span className={styles.barLines}>
            {/* The total stays the first line, where it was while steps remained: nothing jumps
                and nothing runs under the button. */}
            <span className={styles.barPrice}>
              {total !== null ? <RollingText text={formatPrice(total)} /> : (paidWith?.label ?? '')}
              {discount && <span className={styles.barDiscount}>−{discount.percent}%</span>}
              <CaretUp className={styles.barChevron} weight='bold' aria-hidden />
            </span>
            <span
              className={styles.barHint}
              data-error={errorMessage ? true : undefined}
              aria-live='polite'
            >
              {errorMessage ?? (
                <>
                  <span className={styles.srOnly}>{`${t.dayLong(dayKey)}, `}</span>
                  <span className={styles.barTime}>{time}</span>
                  {readyLine ? ` · ${readyLine}` : ''}
                </>
              )}
            </span>
          </span>
          <span className={styles.srOnly}>{`, ${t('Показать, что выбрано')}`}</span>
        </button>
        <Button size='lg' className={styles.barButton} onClick={onSubmit} disabled={isSubmitting}>
          {buttonLabel}
        </Button>
        {isDetailsOpen && (
          <Sheet
            title={t('Ваша запись')}
            cancelLabel={t('Готово')}
            onClose={() => setIsDetailsOpen(false)}
          >
            {ticket && <div className={styles.ticket}>{ticket}</div>}
            {sheetRows.length > 0 && (
              <dl className={sheet.list}>
                {sheetRows.map((item) => (
                  <div key={item.label} className={sheet.row}>
                    <dt className={sheet.rowLabel}>{item.label}</dt>
                    <dd className={styles.detailValue}>{item.value || '—'}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Sheet>
        )}
      </div>
    )
  }

  if (variant === 'bar') {
    return (
      <div className={styles.bar}>
        {/* Tapping the price shows everything chosen so far, without scrolling back up. */}
        <button type='button' className={styles.barInfo} onClick={() => setIsDetailsOpen(true)}>
          <span className={styles.barPrice}>
            {/* The discount shows before the client commits: the old price struck, the percent. */}
            {discount && service && (
              <s className={styles.barOldPrice}>{formatPrice(service.price)}</s>
            )}
            {/* The total rolls like an odometer when an add-on or a discount changes it. */}
            {total !== null ? (
              <RollingText text={formatPrice(total)} />
            ) : (
              (paidWith?.label ?? t('Онлайн-запись'))
            )}
            {discount && <span className={styles.barDiscount}>−{discount.percent}%</span>}
          </span>
          <span
            className={styles.barHint}
            data-error={errorMessage ? true : undefined}
            data-where={!firstIncompleteStep && address ? true : undefined}
            aria-live='polite'
          >
            {errorMessage ?? hint}
          </span>
          {/* After the visible total, not instead of it: the name keeps what is written (2.5.3). */}
          <span className={styles.srOnly}>{`, ${t('Показать, что выбрано')}`}</span>
        </button>
        <Button size='lg' className={styles.barButton} onClick={onSubmit} disabled={isSubmitting}>
          {buttonLabel}
        </Button>
        {isDetailsOpen && (
          <Sheet
            title={t('Ваша запись')}
            cancelLabel={t('Готово')}
            onClose={() => setIsDetailsOpen(false)}
          >
            {ticket && <div className={styles.ticket}>{ticket}</div>}
            {sheetRows.length > 0 && (
              <dl className={sheet.list}>
                {sheetRows.map((item) => (
                  <div key={item.label} className={sheet.row}>
                    <dt className={sheet.rowLabel}>{item.label}</dt>
                    <dd className={styles.detailValue}>{item.value || '—'}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Sheet>
        )}
      </div>
    )
  }

  const rows: { step: BookingStepId; label: string; value: string | null; extra?: string }[] = [
    {
      step: 'service',
      label: t('Услуга'),
      value: service?.name ?? null,
      extra: service ? t.duration(service.durationMinutes) : undefined,
    },
    { step: 'specialist', label: t('Мастер'), value: specialistLabel || null },
    { step: 'datetime', label: t('Когда'), value: whenLabel },
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
      <h2 className={styles.cardTitle}>{t('Ваша запись')}</h2>
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
                    <span className={styles.rowAction}>{t(NEXT_STEP_HINTS[row.step])}</span>
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
        <span>{t('Итого')}</span>
        <span>
          {discount && service && <s className={styles.oldPrice}>{formatPrice(service.price)}</s>}
          {total !== null ? formatPrice(total) : (paidWith?.label ?? '—')}
        </span>
      </div>
      {paidWith && <p className={styles.deposit}>{paidWith.label}</p>}
      {/* Said before the click: the deposit is paid right after, the rest at the salon. */}
      {deposit ? (
        <p className={styles.deposit}>
          {t(
            'Предоплата {amount} — картой сразу после записи, остальное в салоне. Вернём при отмене за сутки.',
            { amount: formatPrice(deposit) },
          )}
        </p>
      ) : null}
      {firstIncompleteStep === 'contacts' && (
        <p className={styles.nextStep} aria-live='polite'>
          {t(NEXT_STEP_HINTS.contacts)}
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
