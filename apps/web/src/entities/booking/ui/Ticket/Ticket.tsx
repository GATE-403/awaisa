import type { ReactNode } from 'react'
import { CURRENCY, formatAmount, getDateParts } from '@/entities/booking/lib/bookingUtils'
import type { Booking } from '@/shared/api/types'
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
  /** Not booked yet (the form's «Ваша запись»): no number or barcode, «—» for what is still to
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
  const { day, month, weekday } = booking.date
    ? getDateParts(booking.date)
    : { day: '—', month: '', weekday: 'Дата не выбрана' }
  const code = isDraft ? '—' : getBookingCode(booking.id)
  const isCancelled = booking.status === 'cancelled'

  return (
    <article
      className={styles.wrap}
      data-status={booking.status}
      data-draft={isDraft || undefined}
      data-interactive={onOpen ? '' : undefined}
      aria-label={isDraft ? 'Ваша запись' : `Запись ${code}`}
    >
      <div className={styles.ticket}>
        {onOpen && (
          // Stretched under the ticket's own controls: tapping anywhere else opens it.
          <button
            type='button'
            className={styles.open}
            onClick={onOpen}
            aria-label='Показать талон'
          />
        )}
        <div className={styles.main}>
          <header className={styles.brand}>
            <Mascot className={styles.brandMark} />
            <span>{booking.business.name}</span>
            {isCancelled ? (
              <span className={styles.status}>Отменена</span>
            ) : headerAction ? (
              <span className={styles.headerAction}>{headerAction}</span>
            ) : (
              <span className={styles.kind}>{isDraft ? 'Черновик' : 'Электронный талон'}</span>
            )}
          </header>

          <div className={styles.body}>
            <div className={styles.leaf} aria-hidden='true'>
              <span className={styles.leafMonth}>{month}</span>
              <span className={styles.leafDay}>{day}</span>
            </div>
            <div className={styles.details}>
              <p className={styles.weekday}>{weekday}</p>
              <p className={styles.time}>{booking.time || '—'}</p>
              <p className={styles.service}>{booking.serviceName}</p>
              <p className={styles.meta}>
                {[booking.specialistName, booking.business.address].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.stub}>
          <div className={styles.stubInfo}>
            <span className={styles.stubLabel}>Номер</span>
            {onCodeClick ? (
              <button type='button' className={styles.code} onClick={() => onCodeClick(code)}>
                {code}
              </button>
            ) : (
              <span className={styles.code}>{code}</span>
            )}
          </div>
          <div className={styles.stubInfo}>
            <span className={styles.stubLabel}>{isCancelled ? 'Оплата не нужна' : 'К оплате'}</span>
            <span className={styles.amount}>
              {formatAmount(booking.price)} <small>{CURRENCY}</small>
            </span>
          </div>
          {!isDraft && <Barcode value={booking.id} />}
        </div>
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </article>
  )
}
