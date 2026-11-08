import type { ReactNode } from 'react'
import type { Booking } from '@/common/api/types'
import { CURRENCY, formatAmount, getDateParts } from '@/features/booking/bookingUtils'
import { Mascot } from '../Mascot/Mascot'
import { Barcode } from './Barcode'
import styles from './Ticket.module.css'

interface TicketProps {
  booking: Booking
  footer?: ReactNode
  onCodeClick?: (code: string) => void
}

const getBookingCode = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase()

export const Ticket = ({ booking, footer, onCodeClick }: TicketProps) => {
  const { day, month, weekday } = getDateParts(booking.date)
  const code = getBookingCode(booking.id)
  const isCancelled = booking.status === 'cancelled'

  return (
    <article className={styles.wrap} data-status={booking.status} aria-label={`Запись ${code}`}>
      <div className={styles.ticket}>
        <div className={styles.main}>
          <header className={styles.brand}>
            <Mascot className={styles.brandMark} />
            <span>{booking.business.name}</span>
            {isCancelled ? (
              <span className={styles.status}>Отменена</span>
            ) : (
              <span className={styles.kind}>Электронный талон</span>
            )}
          </header>

          <div className={styles.body}>
            <div className={styles.leaf} aria-hidden='true'>
              <span className={styles.leafMonth}>{month}</span>
              <span className={styles.leafDay}>{day}</span>
            </div>
            <div className={styles.details}>
              <p className={styles.weekday}>{weekday}</p>
              <p className={styles.time}>{booking.time}</p>
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
          <Barcode value={booking.id} />
        </div>
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </article>
  )
}
