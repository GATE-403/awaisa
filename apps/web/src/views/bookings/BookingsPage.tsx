'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import NextLink from 'next/link'
import { useToday } from '@/shared/lib/hooks/useToday'
import { Container } from '@/shared/ui/Container/Container'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import { useMyBookings } from '@/views/bookings/model/useMyBookings'
import { BookingHistory } from '@/views/bookings/ui/BookingHistory/BookingHistory'
import { UpcomingBooking } from '@/views/bookings/ui/UpcomingBooking/UpcomingBooking'
import styles from './BookingsPage.module.css'
import { getCountdown, isUpcoming } from './bookingsUtils'
import { AccountCard } from './ui/AccountCard/AccountCard'

export const BookingsPage = () => {
  const today = useToday()
  const { bookings, isReady, canForget, cancellingId, cancel, forget, copyCode } = useMyBookings()
  const upcoming = bookings
    .filter((booking) => isUpcoming(booking, today))
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt))
  const history = bookings.filter((booking) => !isUpcoming(booking, today))

  return (
    <main className={styles.page}>
      <Container size='md' className={styles.content}>
        <AccountCard />

        {!isReady && <Skeleton className={styles.skeleton} />}

        {isReady && bookings.length === 0 && (
          <div className={styles.empty}>
            <Mascot className={styles.mascot} />
            <p className={styles.emptyTitle}>Запишитесь к мастеру</p>
            <p className={styles.emptyText}>
              Найдите салон и выберите время — запись появится здесь
            </p>
            <ButtonLink render={<NextLink href='/' />} size='lg'>
              Найти, куда записаться
            </ButtonLink>
          </div>
        )}

        {upcoming.length > 0 && (
          <section className={styles.section} aria-labelledby='upcoming-title'>
            <h2 id='upcoming-title' className={styles.sectionTitle}>
              Предстоящие
              <span className={styles.count}>{upcoming.length}</span>
            </h2>
            <div className={styles.upcoming}>
              {upcoming.map((booking) => (
                <UpcomingBooking
                  key={booking.id}
                  booking={booking}
                  countdown={getCountdown(booking, today)}
                  isCancelling={cancellingId === booking.id}
                  onCancel={() => cancel(booking.id)}
                  onCodeClick={copyCode}
                />
              ))}
            </div>
          </section>
        )}

        {history.length > 0 && (
          <section className={styles.section} aria-labelledby='history-title'>
            <h2 id='history-title' className={styles.sectionTitle}>
              История
              <span className={styles.count}>{history.length}</span>
            </h2>
            <BookingHistory bookings={history} canForget={canForget} onForget={forget} />
          </section>
        )}
      </Container>
    </main>
  )
}
