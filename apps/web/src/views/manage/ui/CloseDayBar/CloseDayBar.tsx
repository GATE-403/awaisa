'use client'

import { Button } from '@awaisa/ui/Button'
import { Check, X } from '@phosphor-icons/react/ssr'
import { pluralize } from '@/shared/lib/plural'
import styles from './CloseDayBar.module.css'

interface CloseDayBarProps {
  /** Ended visits of the open day without an outcome. */
  openHere: number
  /** The same on other days of the last month. */
  openElsewhere: number
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
          <span className={styles.text}>
            <strong>{visits(openHere)}</strong>{' '}
            {openHere === 1 ? 'прошёл без отметки' : 'прошли без отметки'}
          </span>
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
