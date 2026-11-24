'use client'

import { Button } from '@awaisa/ui/Button'
import { Phone, X } from '@phosphor-icons/react/ssr'
import { PersonAvatar } from '@/entities/business'
import type { ManagedWaitlistEntry } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { formatPhone } from '@/shared/lib/formatPhone'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import styles from './WaitlistSheet.module.css'

interface WaitlistSheetProps {
  dayLabel: string
  entries: ManagedWaitlistEntry[]
  onBook: (entry: ManagedWaitlistEntry) => void
  onRemove: (entry: ManagedWaitlistEntry) => void
  onClose: () => void
}

// Clients waiting for this full day: call them, book them into a freed time, or drop them.
// They also get an SMS on their own as soon as a time opens.
export const WaitlistSheet = ({
  dayLabel,
  entries,
  onBook,
  onRemove,
  onClose,
}: WaitlistSheetProps) => {
  const t = useT()

  return (
    <Sheet
      title={t('Waiting for a slot')}
      cancelLabel={null}
      action={{ label: t('Done'), onClick: onClose }}
      onClose={onClose}
    >
      <p className={styles.lead}>
        {t(
          '{day}. When time frees up, clients get an SMS on their own; you can also book them now.',
          {
            day: dayLabel,
          },
        )}
      </p>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.id} className={styles.row}>
            <PersonAvatar name={entry.customerName} size='md' />
            <div className={styles.text}>
              <p className={styles.name}>{entry.customerName}</p>
              <p className={styles.meta}>
                {entry.service.name} · {entry.specialist?.name ?? t('any specialist')}
              </p>
              <p className={styles.status} data-notified={entry.status === 'notified' || undefined}>
                {entry.status === 'notified'
                  ? t('SMS sent: {time} is free', { time: entry.notifiedTime ?? '' })
                  : t('Waiting since {date}', {
                      date: new Date(entry.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        timeZone: BUSINESS_TIME_ZONE,
                      }),
                    })}
              </p>
              <div className={styles.actions}>
                <Button size='sm' onClick={() => onBook(entry)}>
                  {t('Book')}
                </Button>
                <a href={`tel:${entry.customerPhone}`} className={styles.call}>
                  <Phone aria-hidden />
                  {formatPhone(entry.customerPhone)}
                </a>
              </div>
            </div>
            <button
              type='button'
              className={styles.remove}
              aria-label={t('Remove {name} from the waiting list', { name: entry.customerName })}
              onClick={() => onRemove(entry)}
            >
              <X aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
