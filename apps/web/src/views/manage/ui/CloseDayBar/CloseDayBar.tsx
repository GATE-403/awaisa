'use client'

import { Button } from '@awaisa/ui/Button'
import { Menu } from '@awaisa/ui/Menu'
import { CaretDown, Check, CircleDashed, X } from '@phosphor-icons/react/ssr'
import type { AdminBooking } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { VisitMenuItems } from '@/shared/ui/VisitMenuItem/VisitMenuItem'
import styles from './CloseDayBar.module.css'

interface CloseDayBarProps {
  /** Ended visits of the open day without an outcome. */
  openHere: number
  /** The same on other days of the last month. */
  openElsewhere: number
  /** Who exactly: the open day's unmarked visits, listed from the count. */
  visitsHere?: AdminBooking[]
  /** Brings a visit into view on the calendar, to mark it on its own. */
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
  const isListed = openHere > 0 && visitsHere.length > 0 && Boolean(onOpen)

  return (
    <section
      className={styles.bar}
      aria-label='Неотмеченные визиты'
      data-glyph-inside={isListed || undefined}
    >
      {/* The glyph rides inside the list's trigger when there is one, so its press fill follows
          the capsule's own rounded start. */}
      {!isListed && <CircleDashed weight='bold' className={styles.dot} aria-hidden />}
      {openHere > 0 ? (
        <>
          {visitsHere.length > 0 && onOpen ? (
            // The count opens the list of who it is: time, client, service · master — a tap scrolls
            // the calendar to that visit's card (with «✓ Пришёл» on it).
            <Menu
              label={`${visits(openHere)} ${openHere === 1 ? 'прошёл без отметки' : 'прошли без отметки'} — показать кто`}
              className={styles.who}
              trigger={
                <>
                  <CircleDashed weight='bold' className={styles.dot} aria-hidden />
                  <span className={styles.text}>
                    <strong>{visits(openHere)}</strong>{' '}
                    <span className={styles.long}>
                      {openHere === 1 ? 'прошёл без отметки' : 'прошли без отметки'}
                    </span>
                    <span className={styles.short}>без отметки</span>
                  </span>
                  <CaretDown weight='bold' aria-hidden className={styles.caret} />
                </>
              }
            >
              <VisitMenuItems visits={visitsHere} onPick={onOpen} isMasterShown />
            </Menu>
          ) : (
            <span className={styles.text}>
              <strong>{visits(openHere)}</strong>{' '}
              <span className={styles.long}>
                {openHere === 1 ? 'прошёл без отметки' : 'прошли без отметки'}
              </span>
              <span className={styles.short}>без отметки</span>
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
            <span className={styles.elsewhereLong}>Ещё </span>
            <strong>{visits(openElsewhere)}</strong> в другие дни
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
