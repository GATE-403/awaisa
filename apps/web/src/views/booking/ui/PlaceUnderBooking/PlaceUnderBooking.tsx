import type { ReactNode } from 'react'
import styles from './PlaceUnderBooking.module.css'

// The place's page under a booking opened by a link (the full /<slug>/book route). Hidden while a
// reload goes back to the page the booking was opened over (`BookingReturnOnReload`), so the
// place does not flash before that page comes back.
export const PlaceUnderBooking = ({ children }: { children: ReactNode }) => (
  <div className={styles.place}>{children}</div>
)
