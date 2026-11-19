'use client'

import { MenuItem, MenuSeparator } from '@awaisa/ui/Menu'
import { Fragment } from 'react'
import type { AdminBooking } from '@/shared/api/types'
import styles from './VisitMenuItem.module.css'

interface VisitMenuItemsProps {
  visits: AdminBooking[]
  onPick: (booking: AdminBooking) => void
  /** Add the master's first name after the service (lists that mix masters). */
  isMasterShown?: boolean
}

// Visits in a pull-down menu as Settings rows: the client over «service · master», the time as the
// value on the right, one line each, hairlines between.
export const VisitMenuItems = ({ visits, onPick, isMasterShown = false }: VisitMenuItemsProps) =>
  visits.map((booking, index) => (
    <Fragment key={booking.id}>
      {index > 0 && <MenuSeparator />}
      <MenuItem
        className={styles.item}
        onClick={() => onPick(booking)}
        icon={<span className={styles.time}>{booking.time}</span>}
      >
        <span className={styles.text}>
          <span className={styles.name}>{booking.customerName}</span>
          <span className={styles.meta}>
            {booking.serviceName}
            {isMasterShown && ` · ${booking.specialistName.split(' ')[0]}`}
          </span>
        </span>
      </MenuItem>
    </Fragment>
  ))
