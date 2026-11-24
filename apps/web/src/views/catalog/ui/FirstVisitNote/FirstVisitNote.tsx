'use client'

import { useStoredBookings } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { useT } from '@/shared/i18n'
import styles from './FirstVisitNote.module.css'

// Someone who has never booked here is told, once, what this page is for. Rendered on the server
// for everyone, so a newcomer's first paint already has it; returning clients lose it on mount.
export const FirstVisitNote = () => {
  const t = useT()
  const { bookings, isReady } = useStoredBookings()
  const session = useSession()

  if (isReady && (bookings.length > 0 || session.status === 'signedIn')) return null

  return (
    <p className={styles.note}>
      <strong>{t('Запись к мастерам онлайн.')}</strong>{' '}
      {t('Найдите услугу, выберите время - без звонков.')}
    </p>
  )
}
