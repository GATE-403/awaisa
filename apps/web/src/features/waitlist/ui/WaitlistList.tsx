'use client'

import { BellRinging, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { formatDayLong } from '@/entities/booking'
import { useMyWaitlist } from '../model/useMyWaitlist'
import styles from './WaitlistList.module.css'

// «Жду окна» in the profile: what the client waits for, and the time once one opened up.
export const WaitlistList = () => {
  const { entries, leave } = useMyWaitlist()
  if (entries.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby='waitlist-title'>
      <h2 id='waitlist-title' className={styles.title}>
        Жду окна
      </h2>
      <ul className={styles.list}>
        {entries.map((entry) => {
          const isFree = entry.status === 'notified' && entry.notifiedTime
          const params = new URLSearchParams({
            service: entry.service.id,
            specialist: entry.specialist?.id ?? 'any',
            date: entry.date,
            ...(isFree && entry.notifiedTime ? { time: entry.notifiedTime } : {}),
          })

          return (
            <li
              key={entry.id}
              className={styles.row}
              aria-label={`Жду окна: ${entry.service.name}`}
            >
              <span className={styles.glyph} data-free={isFree || undefined} aria-hidden>
                <BellRinging weight='fill' />
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{entry.service.name}</span>
                <span className={styles.meta}>
                  {formatDayLong(entry.date)} · {entry.business.name}
                  {entry.specialist ? ` · ${entry.specialist.name}` : ''}
                </span>
                {isFree ? (
                  <NextLink href={`/${entry.business.slug}/book?${params}`} className={styles.free}>
                    Освободилось {entry.notifiedTime} — записаться ›
                  </NextLink>
                ) : (
                  <span className={styles.waiting}>Сообщим по SMS, если освободится</span>
                )}
              </span>
              <button
                type='button'
                className={styles.leave}
                aria-label='Больше не ждать'
                onClick={() => void leave(entry.id)}
              >
                <X weight='bold' aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
