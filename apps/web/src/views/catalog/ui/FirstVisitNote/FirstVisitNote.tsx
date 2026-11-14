'use client'

import { useStoredBookings } from '@/entities/booking'
import { useSession } from '@/entities/session'
import styles from './FirstVisitNote.module.css'

// Someone who has never booked here is told, once, what this page is for. Rendered on the server
// for everyone, so a newcomer's first paint already has it; returning clients lose it on mount.
export const FirstVisitNote = () => {
  const { bookings, isReady } = useStoredBookings()
  const session = useSession()

  if (isReady && (bookings.length > 0 || session.status === 'signedIn')) return null

  return (
    <p className={styles.note}>
      <strong>Запись к мастерам онлайн.</strong> Найдите услугу, выберите время — без звонков.
    </p>
  )
}
