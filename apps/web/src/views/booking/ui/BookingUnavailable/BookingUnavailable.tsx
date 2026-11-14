'use client'

import { Button } from '@awaisa/ui/Button'
import { useRouter } from 'next/navigation'
import styles from './BookingUnavailable.module.css'

// Booking tapped on a page, but the place could not be read: say so over the page and let the
// client go back or try again — the page under it stays as it was.
export const BookingUnavailable = () => {
  const router = useRouter()

  return (
    <div className={styles.scrim} role='presentation'>
      <div className={styles.card} role='alertdialog' aria-labelledby='booking-unavailable'>
        <p id='booking-unavailable' className={styles.title}>
          Не получилось открыть запись
        </p>
        <p className={styles.text}>Проверьте соединение и попробуйте ещё раз.</p>
        <div className={styles.actions}>
          <Button variant='secondary' onClick={() => router.back()}>
            Закрыть
          </Button>
          <Button onClick={() => window.location.reload()}>Повторить</Button>
        </div>
      </div>
    </div>
  )
}
