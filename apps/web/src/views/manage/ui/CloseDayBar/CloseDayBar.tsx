'use client'

import { Button } from '@awaisa/ui/Button'
import { Menu } from '@awaisa/ui/Menu'
import { CaretDown, Check, CircleDashed, X } from '@phosphor-icons/react/ssr'
import type { AdminBooking } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
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

// A task, not a setting: it floats over the schedule only while there is something to mark,
// like the cabinet's save bar - the header keeps the day's numbers and its two actions.
export const CloseDayBar = ({
  openHere,
  openElsewhere,
  visitsHere = [],
  onOpen,
  onCloseDay,
  onShowOther,
  onDismiss,
}: CloseDayBarProps) => {
  const t = useT()
  if (openHere === 0 && openElsewhere === 0) return null
  const isListed = openHere > 0 && visitsHere.length > 0 && Boolean(onOpen)
  const visits = (count: number) => t.count(count, ['visit', 'visits'])
  const passed = openHere === 1 ? t('passed unmarked') : t('passed unmarked')

  return (
    <section
      className={styles.bar}
      aria-label={t('Unmarked visits')}
      data-glyph-inside={isListed || undefined}
    >
      {/* The glyph rides inside the list's trigger when there is one, so its press fill follows
          the capsule's own rounded start. */}
      {!isListed && <CircleDashed className={styles.dot} aria-hidden />}
      {openHere > 0 ? (
        <>
          {visitsHere.length > 0 && onOpen ? (
            // The count opens the list of who it is: time, client, service · master - a tap scrolls
            // the calendar to that visit's card (with "✓ Arrived" on it).
            <Menu
              label={t('{visits} {passed}: show who', { visits: visits(openHere), passed })}
              className={styles.who}
              trigger={
                <>
                  <CircleDashed className={styles.dot} aria-hidden />
                  <span className={styles.text}>
                    <strong>{visits(openHere)}</strong>{' '}
                    <span className={styles.long}>{passed}</span>
                    <span className={styles.short}>{t('unmarked')}</span>
                  </span>
                  <CaretDown aria-hidden className={styles.caret} />
                </>
              }
            >
              <VisitMenuItems visits={visitsHere} onPick={onOpen} isMasterShown />
            </Menu>
          ) : (
            <span className={styles.text}>
              <strong>{visits(openHere)}</strong> <span className={styles.long}>{passed}</span>
              <span className={styles.short}>{t('unmarked')}</span>
            </span>
          )}
          <Button size='sm' variant='contrast' onClick={onCloseDay}>
            <Check aria-hidden />
            {t('Everyone came')}
          </Button>
        </>
      ) : (
        <>
          <span className={styles.text}>
            <span className={styles.elsewhereLong}>{t('More')} </span>
            <strong>{visits(openElsewhere)}</strong> {t('on other days')}
          </span>
          <Button size='sm' variant='secondary' onClick={onShowOther}>
            {t('Show')}
          </Button>
        </>
      )}
      <button type='button' className={styles.close} onClick={onDismiss} aria-label={t('Hide')}>
        <X aria-hidden />
      </button>
    </section>
  )
}
