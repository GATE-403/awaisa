'use client'

import { type CSSProperties, type KeyboardEvent, useRef, useState } from 'react'
import type { PublicProfile } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import styles from '../ProfilePage.module.css'

type Month = NonNullable<PublicProfile['activity']>[number]

interface VisitYearProps {
  months: Month[]
}

// The year in visits, like GitHub's contribution calendar: twelve months as columns of dots (one
// a visit); pointing, tapping or arrowing a month reads it in the line above - how many, where
// and with whom. One Tab stop, arrows move (like the cabinet's heatmap).
export const VisitYear = ({ months }: VisitYearProps) => {
  const t = useT()
  const total = months.reduce((sum, month) => sum + month.visits, 0)
  const peak = Math.max(1, ...months.map((month) => month.visits))
  const busiest = months.reduce<Month | null>(
    (best, month) => (month.visits > (best?.visits ?? 0) ? month : best),
    null,
  )
  const lastWithVisits = months.findLastIndex((month) => month.visits > 0)
  const [picked, setPicked] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState(Math.max(0, lastWithVisits))
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const monthLabel = (month: Month) =>
    `${t.monthShort(`${month.month}-01`)} ${month.month.slice(0, 4)}`
  const shown = picked === null ? null : months[picked]

  const move = (event: KeyboardEvent, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = Math.min(months.length - 1, Math.max(0, index + step))
    setFocusIndex(next)
    setPicked(next)
    buttons.current[next]?.focus()
  }

  return (
    <div className={styles.year}>
      {/* The line above reads the month in view, else the year as a whole. */}
      <p className={styles.yearLine} aria-live='polite'>
        {shown ? (
          <>
            <strong>{monthLabel(shown)}</strong>
            {' · '}
            {shown.visits > 0
              ? t.count(shown.visits, ['визит', 'визита', 'визитов'])
              : t('без визитов')}
            {shown.items.length > 0 &&
              ` · ${shown.items
                .map((item) =>
                  item.masterName
                    ? t('{service} · {master}, {place}', {
                        service: item.serviceName,
                        master: item.masterName.split(' ')[0] ?? item.masterName,
                        place: item.businessName,
                      })
                    : `${item.serviceName}, ${item.businessName}`,
                )
                .join('; ')}`}
          </>
        ) : (
          <>
            {t('За год')} <strong>{t.count(total, ['визит', 'визита', 'визитов'])}</strong>
            {busiest && ` · ${t('чаще всего в {month}', { month: monthLabel(busiest) })}`}
          </>
        )}
      </p>
      <fieldset
        className={styles.yearGrid}
        style={{ '--rows': Math.min(peak, 6) } as CSSProperties}
        aria-label={t('Визиты по месяцам')}
        onMouseLeave={() => setPicked(null)}
      >
        {months.map((month, index) => (
          <button
            key={month.month}
            ref={(node) => {
              buttons.current[index] = node
            }}
            type='button'
            className={styles.yearMonth}
            tabIndex={index === focusIndex ? 0 : -1}
            aria-pressed={picked === index}
            aria-label={`${monthLabel(month)}: ${t.count(month.visits, ['визит', 'визита', 'визитов'])}`}
            data-picked={picked === index || undefined}
            style={{ '--i': index, '--fill': month.visits / peak } as CSSProperties}
            onMouseEnter={() => setPicked(index)}
            onFocus={() => {
              setFocusIndex(index)
              setPicked(index)
            }}
            onClick={() => setPicked(index)}
            onKeyDown={(event) => move(event, index)}
          >
            <span className={styles.yearBar} aria-hidden>
              {Array.from({ length: Math.min(month.visits, 6) }, (_, dot) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed dots of a count
                <span key={dot} className={styles.yearDot} />
              ))}
            </span>
            <span className={styles.yearLabel} aria-hidden>
              {t.monthShort(`${month.month}-01`).replace('.', '').slice(0, 3)}
            </span>
          </button>
        ))}
      </fieldset>
    </div>
  )
}
