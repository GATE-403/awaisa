'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import NextLink from 'next/link'
import { Container } from '@/common/components/Container/Container'
import { Mascot } from '@/common/components/Mascot/Mascot'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { Ticket } from '@/common/components/Ticket/Ticket'
import styles from './BookingsPage.module.css'
import { CancelBookingButton } from './components/CancelBookingButton/CancelBookingButton'
import { useMyBookings } from './hooks/useMyBookings'

export const BookingsPage = () => {
  const { bookings, isReady, cancellingId, cancel, forget, copyCode } = useMyBookings()

  return (
    <main className={styles.page}>
      <Container size='md' className={styles.content}>
        <PageTitle title='Мои записи.' subtitle='Билеты хранятся на этом устройстве.' />

        {!isReady && <Skeleton className={styles.skeleton} />}

        {isReady && bookings.length === 0 && (
          <div className={styles.empty}>
            <Mascot className={styles.mascot} />
            <p className={styles.emptyTitle}>Записей пока нет</p>
            <p className={styles.emptyText}>Выберите услугу и удобное время — это займёт минуту</p>
            <ButtonLink render={<NextLink href='/book' />} size='lg'>
              Записаться
            </ButtonLink>
          </div>
        )}

        {bookings.length > 0 && (
          <ul className={styles.list}>
            {bookings.map((booking) => (
              <li key={booking.id} className={styles.item}>
                <Ticket
                  booking={booking}
                  onCodeClick={copyCode}
                  footer={
                    booking.status === 'cancelled' ? (
                      <Button variant='ghost' size='sm' onClick={() => forget(booking.id)}>
                        Убрать из списка
                      </Button>
                    ) : (
                      <CancelBookingButton
                        booking={booking}
                        isCancelling={cancellingId === booking.id}
                        onConfirm={() => cancel(booking.id)}
                      />
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  )
}
