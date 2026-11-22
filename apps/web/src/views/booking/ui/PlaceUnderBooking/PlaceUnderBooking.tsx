import type { ReactNode } from 'react'
import styles from './PlaceUnderBooking.module.css'

interface PlaceUnderBookingProps {
  children: ReactNode
  /** The catalog's skeleton, shown while a reload goes back to the catalog. */
  catalogSkeleton?: ReactNode
}

// The place's page under a booking opened by a link (the full /<slug>/book route). Hidden while a
// reload goes back to the page the booking was opened over (`BookingReturnOnReload`), so the
// place does not flash before that page comes back; going back to the catalog, the catalog's
// skeleton stands in meanwhile (an empty screen under the header looked broken).
export const PlaceUnderBooking = ({ children, catalogSkeleton }: PlaceUnderBookingProps) => (
  <>
    <div className={styles.place}>{children}</div>
    {catalogSkeleton && <div className={styles.catalog}>{catalogSkeleton}</div>}
  </>
)
