import { X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { BusinessTile } from '@/entities/business'
import type { Business } from '@/shared/api/types'
import styles from './BookingTopBar.module.css'

interface BookingTopBarProps {
  business: Business
}

// Booking opens like a page inside Telegram's in-app browser: its own bar with the place and a
// close button, no site header or catalog around it — all attention on the form.
export const BookingTopBar = ({ business }: BookingTopBarProps) => (
  <header className={styles.bar}>
    <div className={styles.inner}>
      <NextLink href={`/${business.slug}`} className={styles.close} aria-label='Закрыть запись'>
        <X weight='bold' aria-hidden />
      </NextLink>
      <div className={styles.title}>
        <BusinessTile name={business.name} size='xs' />
        <span className={styles.text}>
          <h1 className={styles.heading}>Запись</h1>
          <span className={styles.place}>{business.name}</span>
        </span>
      </div>
      <span className={styles.spacer} aria-hidden />
    </div>
  </header>
)
