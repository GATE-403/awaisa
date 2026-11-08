'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import NextLink from 'next/link'
import { Container } from '@/common/components/Container/Container'
import { Mascot } from '@/common/components/Mascot/Mascot'
import { formatDayLong, formatPrice } from '@/features/booking/bookingUtils'
import styles from './BookingsPage.module.css'
import { useMyBookings } from './hooks/useMyBookings'

export const BookingsPage = () => {
  const { bookings, isReady, cancellingId, error, cancel, forget } = useMyBookings()

  return (
    <main className={styles.page}>
      <Container size='md' className={styles.content}>
        <h1 className={styles.title}>Мои записи</h1>

        {!isReady && <Skeleton className={styles.skeleton} />}

        {isReady && bookings.length === 0 && (
          <div className={styles.empty}>
            <Mascot className={styles.mascot} />
            <p className={styles.emptyTitle}>Записей пока нет</p>
            <p className={styles.emptyText}>Выберите услугу и удобное время — это займёт минуту</p>
            <Button render={<NextLink href='/book' />} nativeButton={false} size='lg'>
              Записаться
            </Button>
          </div>
        )}

        {error && (
          <p className={styles.error} role='alert'>
            {error}
          </p>
        )}

        {bookings.length > 0 && (
          <ul className={styles.list}>
            {bookings.map((booking) => {
              const isCancelled = booking.status === 'cancelled'

              return (
                <li
                  key={booking.id}
                  className={styles.card}
                  data-cancelled={isCancelled || undefined}
                >
                  <div className={styles.cardBody}>
                    <p className={styles.when}>
                      {formatDayLong(booking.date)}, {booking.time}
                    </p>
                    <p className={styles.service}>
                      {booking.serviceName} · {formatPrice(booking.price)}
                    </p>
                    <p className={styles.specialist}>{booking.specialistName}</p>
                    {isCancelled && <p className={styles.status}>Отменена</p>}
                  </div>
                  {isCancelled ? (
                    <Button variant='ghost' size='sm' onClick={() => forget(booking.id)}>
                      Скрыть
                    </Button>
                  ) : (
                    <Button
                      variant='ghost'
                      size='sm'
                      disabled={cancellingId === booking.id}
                      onClick={() => cancel(booking.id)}
                    >
                      {cancellingId === booking.id ? 'Отменяем…' : 'Отменить'}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Container>
    </main>
  )
}
