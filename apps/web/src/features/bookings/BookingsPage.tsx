'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import NextLink from 'next/link'
import type { Booking } from '@/common/api/types'
import { Container } from '@/common/components/Container/Container'
import { Mascot } from '@/common/components/Mascot/Mascot'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { Ticket } from '@/common/components/Ticket/Ticket'
import { formatPhone } from '@/common/utils/formatPhone'
import styles from './BookingsPage.module.css'
import { CancelBookingButton } from './components/CancelBookingButton/CancelBookingButton'
import { useMyBookings } from './hooks/useMyBookings'

export const BookingsPage = () => {
  const {
    bookings,
    isReady,
    isSignedIn,
    phone,
    canForget,
    cancellingId,
    cancel,
    forget,
    copyCode,
  } = useMyBookings()
  const renderFooter = (booking: Booking) => {
    if (booking.status !== 'cancelled') {
      return (
        <CancelBookingButton
          booking={booking}
          isCancelling={cancellingId === booking.id}
          onConfirm={() => cancel(booking.id)}
        />
      )
    }
    if (!canForget(booking.id)) return null

    return (
      <Button variant='ghost' size='sm' onClick={() => forget(booking.id)}>
        Убрать из списка
      </Button>
    )
  }
  const subtitle = isSignedIn
    ? `Все записи на номер ${formatPhone(phone ?? '')}.`
    : 'Билеты хранятся на этом устройстве.'

  return (
    <main className={styles.page}>
      <Container size='md' className={styles.content}>
        <PageTitle title='Мои записи.' subtitle={subtitle} />

        {isReady && !isSignedIn && (
          <p className={styles.signIn}>
            <NextLink href='/login?next=/bookings'>Войдите по номеру телефона</NextLink>, чтобы
            видеть записи на любом устройстве и получать SMS.
          </p>
        )}

        {!isReady && <Skeleton className={styles.skeleton} />}

        {isReady && bookings.length === 0 && (
          <div className={styles.empty}>
            <Mascot className={styles.mascot} />
            <p className={styles.emptyTitle}>Записей пока нет</p>
            <p className={styles.emptyText}>Выберите услугу и удобное время — это займёт минуту</p>
            <ButtonLink render={<NextLink href='/' />} size='lg'>
              Найти, куда записаться
            </ButtonLink>
          </div>
        )}

        {bookings.length > 0 && (
          <ul className={styles.list}>
            {bookings.map((booking) => (
              <li key={booking.id} className={styles.item}>
                <Ticket booking={booking} onCodeClick={copyCode} footer={renderFooter(booking)} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  )
}
