'use client'

import { Button } from '@awaisa/ui/Button'
import { Phone, X } from '@phosphor-icons/react/ssr'
import { PersonAvatar } from '@/entities/business'
import type { ManagedWaitlistEntry } from '@/shared/api/types'
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
}: WaitlistSheetProps) => (
  <Sheet
    title='Ждут окна'
    cancelLabel={null}
    action={{ label: 'Готово', onClick: onClose }}
    onClose={onClose}
  >
    <p className={styles.lead}>
      {dayLabel}. Освободится время — клиенты получат SMS сами; можно и записать их сразу.
    </p>
    <ul className={styles.list}>
      {entries.map((entry) => (
        <li key={entry.id} className={styles.row}>
          <PersonAvatar name={entry.customerName} size='md' />
          <div className={styles.text}>
            <p className={styles.name}>{entry.customerName}</p>
            <p className={styles.meta}>
              {entry.service.name} · {entry.specialist?.name ?? 'любой мастер'}
            </p>
            <p className={styles.status} data-notified={entry.status === 'notified' || undefined}>
              {entry.status === 'notified'
                ? `SMS отправлено: свободно ${entry.notifiedTime}`
                : `Ждёт с ${new Date(entry.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`}
            </p>
            <div className={styles.actions}>
              <Button size='sm' onClick={() => onBook(entry)}>
                Записать
              </Button>
              <a href={`tel:${entry.customerPhone}`} className={styles.call}>
                <Phone weight='fill' aria-hidden />
                {formatPhone(entry.customerPhone)}
              </a>
            </div>
          </div>
          <button
            type='button'
            className={styles.remove}
            aria-label={`Убрать ${entry.customerName} из листа ожидания`}
            onClick={() => onRemove(entry)}
          >
            <X weight='bold' aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  </Sheet>
)
