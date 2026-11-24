'use client'

import { Button } from '@awaisa/ui/Button'
import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Phone, X } from '@phosphor-icons/react/ssr'
import { PersonAvatar } from '@/entities/business'
import type { ManagedWaitlistEntry } from '@/shared/api/types'
import { formatDate, useLocale } from '@/shared/i18n'
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
  const { t } = useLingui()
  const locale = useLocale()

  return (
    <Sheet
      title={t({ message: 'Waiting for a slot', context: 'clients waiting, plural' })}
      cancelLabel={null}
      action={{ label: t`Done`, onClick: onClose }}
      onClose={onClose}
    >
      <p className={styles.lead}>
        {t`${ph({ day: dayLabel })}. When time frees up, clients get an SMS on their own; you can also book them now.`}
      </p>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.id} className={styles.row}>
            <PersonAvatar name={entry.customerName} size='md' />
            <div className={styles.text}>
              <p className={styles.name}>{entry.customerName}</p>
              <p className={styles.meta}>
                {entry.service.name} · {entry.specialist?.name ?? t`any specialist`}
              </p>
              <p className={styles.status} data-notified={entry.status === 'notified' || undefined}>
                {entry.status === 'notified'
                  ? t`SMS sent: ${ph({ time: entry.notifiedTime ?? '' })} is free`
                  : t`Waiting since ${ph({
                      date: formatDate(locale, entry.createdAt, { day: 'numeric', month: 'short' }),
                    })}`}
              </p>
              <div className={styles.actions}>
                <Button size='sm' onClick={() => onBook(entry)}>
                  {t({ message: 'Book', context: 'staff books a client' })}
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
              aria-label={t`Remove ${ph({ name: entry.customerName })} from the waiting list`}
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
