'use client'

import { MenuItem } from '@awaisa/ui/Menu'
import type { AdminBooking } from '@/shared/api/types'
import styles from './VisitMenuItem.module.css'

interface VisitMenuItemsProps {
  visits: AdminBooking[]
  onPick: (booking: AdminBooking) => void
  /** Add the master's first name after the service (lists that mix masters). */
  isMasterShown?: boolean
}

// Visits in a pull-down menu, like a macOS menu: one line each — the time in a quiet column, the
// client in regular weight, «service · master» fading after — no rules between them.
export const VisitMenuItems = ({ visits, onPick, isMasterShown = false }: VisitMenuItemsProps) =>
  visits.map((booking) => (
    <MenuItem key={booking.id} className={styles.item} onClick={() => onPick(booking)}>
      <span className={styles.line}>
        <span className={styles.time}>{booking.time}</span>
        <span className={styles.name}>{booking.customerName}</span>
        <span className={styles.meta}>
          {booking.serviceName}
          {isMasterShown && ` · ${booking.specialistName.split(' ')[0]}`}
        </span>
      </span>
    </MenuItem>
  ))
