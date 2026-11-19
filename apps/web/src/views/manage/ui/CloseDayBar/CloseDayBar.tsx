'use client'

import { Button } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { CaretDown, Check, X } from '@phosphor-icons/react/ssr'
import type { AdminBooking } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import styles from './CloseDayBar.module.css'

interface CloseDayBarProps {
  /** Ended visits of the open day without an outcome. */
  openHere: number
  /** The same on other days of the last month. */
  openElsewhere: number
  /** Who exactly: the open day's unmarked visits, listed from the count. */
  visitsHere?: AdminBooking[]
  /** Opens a visit's sheet to mark it on its own. */
  onOpen?: (booking: AdminBooking) => void
  onCloseDay: () => void
  onShowOther: () => void
  onDismiss: () => void
}

const visits = (count: number) => pluralize(count, ['визит', 'визита', 'визитов'])

// A task, not a setting: it floats over the schedule only while there is something to mark,
// like the cabinet's save bar — the header keeps the day's numbers and its two actions.
export const CloseDayBar = ({
  openHere,
  openElsewhere,
  visitsHere = [],
  onOpen,
  onCloseDay,
  onShowOther,
  onDismiss,
}: CloseDayBarProps) => {
  if (openHere === 0 && openElsewhere === 0) return null

  return (
    <section className={styles.bar} aria-label='Неотмеченные визиты'>
      <span className={styles.dot} aria-hidden />
      {openHere > 0 ? (
        <>
          {visitsHere.length > 0 && onOpen ? (
            // The count opens the list of who it is: time, client, service · master — a tap opens
            // that visit to mark it on its own.
            <Menu
              label={`${visits(openHere)} ${openHere === 1 ? 'прошёл без отметки' : 'прошли без отметки'} — показать кто`}
              className={styles.who}
              trigger={
                <>
                  <span className={styles.text}>
                    <strong>{visits(openHere)}</strong>{' '}
                    {openHere === 1 ? 'прошёл без отметки' : 'прошли без отметки'}
                  </span>
                  <CaretDown weight='bold' aria-hidden className={styles.caret} />
                </>
              }
            >
              {visitsHere.map((booking) => (
                <MenuItem key={booking.id} onClick={() => onOpen(booking)}>
                  <span className={styles.visitTime}>{booking.time}</span> {booking.customerName}
                  <span className={styles.visitMeta}>
                    {' '}
                    · {booking.serviceName} · {booking.specialistName}
                  </span>
                </MenuItem>
              ))}
            </Menu>
          ) : (
            <span className={styles.text}>
              <strong>{visits(openHere)}</strong>{' '}
              {openHere === 1 ? 'прошёл без отметки' : 'прошли без отметки'}
            </span>
          )}
          <Button size='sm' variant='contrast' onClick={onCloseDay}>
            <Check weight='bold' aria-hidden />
            Все пришли
          </Button>
        </>
      ) : (
        <>
          <span className={styles.text}>
            Ещё <strong>{visits(openElsewhere)}</strong> в другие дни
          </span>
          <Button size='sm' variant='secondary' onClick={onShowOther}>
            Показать
          </Button>
        </>
      )}
      <button type='button' className={styles.close} onClick={onDismiss} aria-label='Скрыть'>
        <X weight='bold' aria-hidden />
      </button>
    </section>
  )
}
