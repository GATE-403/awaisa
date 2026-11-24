'use client'

import { BellRinging, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useT } from '@/shared/i18n'
import { useMyWaitlist } from '../model/useMyWaitlist'
import styles from './WaitlistList.module.css'

// «Жду окна» in the profile: what the client waits for, and the time once one opened up.
export const WaitlistList = () => {
  const t = useT()
  const { entries, leave } = useMyWaitlist()
  if (entries.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby='waitlist-title'>
      <h2 id='waitlist-title' className={styles.title}>
        {t('Waiting for a slot')}
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
              aria-label={t('Waiting for a slot: {service}', { service: entry.service.name })}
            >
              <span className={styles.glyph} data-free={isFree || undefined} aria-hidden>
                <BellRinging />
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{entry.service.name}</span>
                <span className={styles.meta}>
                  {t.dayLong(entry.date)} · {entry.business.name}
                  {entry.specialist ? ` · ${entry.specialist.name}` : ''}
                </span>
                {isFree ? (
                  <NextLink href={`/${entry.business.slug}/book?${params}`} className={styles.free}>
                    {t('{time} is free: book ›', { time: entry.notifiedTime ?? '' })}
                  </NextLink>
                ) : (
                  <span className={styles.waiting}>{t('We will text you if a slot opens')}</span>
                )}
              </span>
              <button
                type='button'
                className={styles.leave}
                aria-label={t('Stop waiting')}
                onClick={() => void leave(entry.id)}
              >
                <X aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
