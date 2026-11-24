'use client'

import type { ReactNode } from 'react'
import {
  CURRENCY,
  formatAmount,
  formatPrice,
  getDateParts,
} from '@/entities/booking/lib/bookingUtils'
import type { Booking } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import { Barcode } from './Barcode'
import styles from './Ticket.module.css'

interface TicketProps {
  booking: Booking
  footer?: ReactNode
  onCodeClick?: (code: string) => void
  /** Makes the whole ticket a button (e.g. show it full screen). */
  onOpen?: () => void
  /** A control in the top-right corner instead of the «Электронный талон» label. */
  headerAction?: ReactNode
  /** Not booked yet (the form's «Ваша запись»): no number or barcode, «-» for what is still to
      choose. */
  isDraft?: boolean
}

const getBookingCode = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase()

export const Ticket = ({
  booking,
  footer,
  onCodeClick,
  onOpen,
  headerAction,
  isDraft = false,
}: TicketProps) => {
  const t = useT()
  const weekdayName = booking.date ? t.weekdayLong(booking.date) : ''
  const { day, month, weekday } = booking.date
    ? {
        day: getDateParts(booking.date).day,
        month: t.monthShort(booking.date),
        weekday: weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1),
      }
    : { day: '-', month: '', weekday: t('Дата не выбрана') }
  const code = isDraft ? '-' : getBookingCode(booking.id)
  const isCancelled = booking.status === 'cancelled'
  const price = booking.price - (booking.discount?.amount ?? 0)
  const isDepositPaid = booking.payment?.status === 'paid'
  const toPay = isDepositPaid ? Math.max(0, price - (booking.payment?.amount ?? 0)) : price
  const payLabel = isCancelled
    ? t('Оплата не нужна')
    : isDepositPaid
      ? t('В салоне')
      : t('К оплате')

  return (
    <article
      className={styles.wrap}
      data-status={booking.status}
      data-draft={isDraft || undefined}
      data-interactive={onOpen ? '' : undefined}
      aria-label={isDraft ? t('Ваша запись') : t('Запись {code}', { code })}
    >
      <div className={styles.ticket}>
        {onOpen && (
          // Stretched under the ticket's own controls: tapping anywhere else opens it.
          <button
            type='button'
            className={styles.open}
            onClick={onOpen}
            aria-label={t('Показать талон')}
          />
        )}
        <div className={styles.main}>
          <header className={styles.brand}>
            <Mascot className={styles.brandMark} />
            <span>{booking.business.name}</span>
            {isCancelled ? (
              <span className={styles.status}>{t('Отменена')}</span>
            ) : headerAction ? (
              <span className={styles.headerAction}>{headerAction}</span>
            ) : (
              <span className={styles.kind}>
                {isDraft ? t('Черновик') : t('Электронный талон')}
              </span>
            )}
          </header>

          <div className={styles.body}>
            <div className={styles.leaf} aria-hidden='true'>
              <span className={styles.leafMonth}>{month}</span>
              <span className={styles.leafDay}>{day}</span>
            </div>
            <div className={styles.details}>
              <p className={styles.weekday}>{weekday}</p>
              <p className={styles.time}>{booking.time || '-'}</p>
              <p className={styles.service}>{booking.serviceName}</p>
              <p className={styles.meta}>
                {[booking.specialistName, booking.business.address].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.stub}>
          {/* The price leads the stub: it is what people look for on a ticket, the number only
              matters at the desk. */}
          <div className={styles.stubInfo}>
            <span className={styles.stubLabel}>
              {payLabel}
              {/* On the label's line, so the stub keeps two lines and its fixed height. */}
              {booking.discount && !isCancelled && (
                <s className={styles.oldAmount}>{formatPrice(booking.price)}</s>
              )}
            </span>
            <span className={styles.amount}>
              {formatAmount(toPay)} <small>{CURRENCY}</small>
            </span>
          </div>
          <div className={styles.stubInfo}>
            <span className={styles.stubLabel}>{t('Номер')}</span>
            {onCodeClick ? (
              <button type='button' className={styles.code} onClick={() => onCodeClick(code)}>
                {code}
              </button>
            ) : (
              <span className={styles.code}>{code}</span>
            )}
          </div>
          {!isDraft && <Barcode value={booking.id} />}
        </div>
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </article>
  )
}
