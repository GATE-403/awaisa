import NextLink from 'next/link'
import { getDateParts } from '@/entities/booking'
import type { Booking } from '@/shared/api/types'
import styles from './BookingHistory.module.css'

interface BookingHistoryProps {
  bookings: Booking[]
  canForget: (id: string) => boolean
  onForget: (id: string) => void
}

const getCode = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase()

export const BookingHistory = ({ bookings, canForget, onForget }: BookingHistoryProps) => (
  <ul className={styles.list}>
    {bookings.map((booking) => {
      const { day, month } = getDateParts(booking.date)
      const isCancelled = booking.status === 'cancelled'

      return (
        <li key={booking.id}>
          <article className={styles.row} aria-label={`Запись ${getCode(booking.id)}`}>
            <span className={styles.leaf} aria-hidden='true'>
              <span className={styles.leafMonth}>{month}</span>
              <span className={styles.leafDay}>{day}</span>
            </span>
            <span className={styles.body}>
              <span className={styles.title}>{booking.serviceName}</span>
              <span className={styles.meta}>
                {booking.business.name} · {booking.time}
                {isCancelled ? (
                  <span className={styles.cancelled}> · Отменена</span>
                ) : (
                  ' · Состоялась'
                )}
              </span>
            </span>
            <span className={styles.actions}>
              {isCancelled && canForget(booking.id) && (
                <button
                  type='button'
                  className={styles.textButton}
                  onClick={() => onForget(booking.id)}
                  aria-label='Убрать из списка'
                >
                  Убрать
                </button>
              )}
              <NextLink
                href={`/${booking.business.slug}/book?service=${booking.serviceId}&specialist=${booking.specialistId}`}
                className={styles.again}
              >
                Снова
              </NextLink>
            </span>
          </article>
        </li>
      )
    })}
  </ul>
)
