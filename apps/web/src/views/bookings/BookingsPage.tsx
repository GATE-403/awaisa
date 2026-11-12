'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { WaitlistList } from '@/features/waitlist'
import type { Booking } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import { Container } from '@/shared/ui/Container/Container'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import { useMyBookings } from '@/views/bookings/model/useMyBookings'
import { BookingHistory } from '@/views/bookings/ui/BookingHistory/BookingHistory'
import { UpcomingBooking } from '@/views/bookings/ui/UpcomingBooking/UpcomingBooking'
import styles from './BookingsPage.module.css'
import { getCountdown, isUpcoming } from './bookingsUtils'
import { AccountCard } from './ui/AccountCard/AccountCard'
import { LoyaltyCard } from './ui/LoyaltyCard/LoyaltyCard'

interface BookingsPageProps {
  /** The signed-in account's bookings, read on the server for this request. */
  initialAccountBookings?: Booking[] | null
}

export const BookingsPage = ({ initialAccountBookings = null }: BookingsPageProps) => {
  const today = useToday()
  const { bookings, isReady, canForget, cancellingId, cancel, replace, forget } =
    useMyBookings(initialAccountBookings)
  const router = useRouter()
  const toast = useToast()
  const upcoming = bookings
    .filter((booking) => isUpcoming(booking, today))
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt))
  const history = bookings.filter((booking) => !isUpcoming(booking, today))

  // Back from the deposit checkout (`?paid=<booking>`): say it worked, once. Read from the URL in
  // an effect — this page is also the prerendered shell, where search params do not exist.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on arrival
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('paid')) return
    toast.show({
      title: 'Предоплата внесена',
      description: 'Вы записаны — ждём вас',
      type: 'success',
    })
    router.replace('/bookings', { scroll: false })
  }, [])

  return (
    <main className={styles.page}>
      <Container size='md' className={styles.content}>
        <AccountCard />

        {!isReady && <Skeleton className={styles.skeleton} />}

        {/* Waiting for a time comes before the empty state, after real visits otherwise. */}
        {isReady && bookings.length === 0 && <WaitlistList />}

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
                  onMoved={replace}
                />
              ))}
            </div>
          </section>
        )}

        {bookings.length > 0 && <WaitlistList />}

        <LoyaltyCard />

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
