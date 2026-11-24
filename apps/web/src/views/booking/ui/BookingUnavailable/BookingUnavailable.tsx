'use client'

import { Button } from '@awaisa/ui/Button'
import { useLingui } from '@lingui/react/macro'
import { useRouter } from '@/shared/i18n/navigation'
import styles from './BookingUnavailable.module.css'

// Booking tapped on a page, but the place could not be read: say so over the page and let the
// client go back or try again - the page under it stays as it was.
export const BookingUnavailable = () => {
  const router = useRouter()
  const { t } = useLingui()

  return (
    <div className={styles.scrim} role='presentation'>
      <div className={styles.card} role='alertdialog' aria-labelledby='booking-unavailable'>
        <p id='booking-unavailable' className={styles.title}>
          {t`Could not open booking`}
        </p>
        <p className={styles.text}>{t`Check the connection and try again.`}</p>
        <div className={styles.actions}>
          <Button variant='secondary' onClick={() => router.back()}>
            {t`Close`}
          </Button>
          <Button onClick={() => window.location.reload()}>{t`Retry`}</Button>
        </div>
      </div>
    </div>
  )
}
