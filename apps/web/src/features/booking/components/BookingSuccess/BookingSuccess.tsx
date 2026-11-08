import { Button } from '@awaisa/ui/Button'
import { CircleCheck } from 'lucide-react'
import NextLink from 'next/link'
import type { Booking } from '@/common/api/types'
import { COMPANY } from '@/constants/company'
import { formatDayLong, formatPrice } from '../../bookingUtils'
import styles from './BookingSuccess.module.css'

interface BookingSuccessProps {
  booking: Booking
}

export const BookingSuccess = ({ booking }: BookingSuccessProps) => (
  <div className={styles.success}>
    <CircleCheck className={styles.icon} aria-hidden />
    <h1 className={styles.title}>Вы записаны</h1>
    <p className={styles.lead}>
      {formatDayLong(booking.date)}, {booking.time}
    </p>
    <dl className={styles.details}>
      <div>
        <dt>Услуга</dt>
        <dd>
          {booking.serviceName} · {formatPrice(booking.price)}
        </dd>
      </div>
      <div>
        <dt>Мастер</dt>
        <dd>{booking.specialistName}</dd>
      </div>
      <div>
        <dt>Адрес</dt>
        <dd>{COMPANY.address}</dd>
      </div>
    </dl>
    <p className={styles.note}>
      Запись сохранена в «Мои записи» на этом устройстве — там её можно отменить.
    </p>
    <div className={styles.actions}>
      <Button render={<NextLink href='/bookings' />} nativeButton={false} size='lg'>
        Мои записи
      </Button>
      <Button render={<NextLink href='/' />} nativeButton={false} size='lg' variant='secondary'>
        На главную
      </Button>
    </div>
  </div>
)
