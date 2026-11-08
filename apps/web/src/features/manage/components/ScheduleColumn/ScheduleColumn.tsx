import { Button } from '@awaisa/ui/Button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@awaisa/ui/Dialog'
import { X } from '@phosphor-icons/react/ssr'
import type { AdminBooking, Specialist, TimeOff } from '@/common/api/types'
import { addMinutes } from '../../manageUtils'
import styles from './ScheduleColumn.module.css'

interface ScheduleColumnProps {
  specialist: Pick<Specialist, 'id' | 'name' | 'role'>
  bookings: AdminBooking[]
  timeOff: TimeOff[]
  onCancelBooking: (id: string) => void
  onRemoveTimeOff: (id: string) => void
}

type Entry =
  | { kind: 'booking'; time: string; booking: AdminBooking }
  | { kind: 'timeOff'; time: string; timeOff: TimeOff }

export const ScheduleColumn = ({
  specialist,
  bookings,
  timeOff,
  onCancelBooking,
  onRemoveTimeOff,
}: ScheduleColumnProps) => {
  const entries: Entry[] = [
    ...bookings.map((booking) => ({ kind: 'booking' as const, time: booking.time, booking })),
    ...timeOff.map((item) => ({ kind: 'timeOff' as const, time: item.from, timeOff: item })),
  ].sort((first, second) => first.time.localeCompare(second.time))
  const confirmedCount = bookings.filter((booking) => booking.status === 'confirmed').length

  return (
    <section className={styles.column} aria-labelledby={`master-${specialist.id}`}>
      <header className={styles.header}>
        <h2 id={`master-${specialist.id}`} className={styles.name}>
          {specialist.name}
        </h2>
        <p className={styles.meta}>
          {specialist.role} · {confirmedCount === 0 ? 'записей нет' : `записей: ${confirmedCount}`}
        </p>
      </header>

      {entries.length === 0 && <p className={styles.empty}>Весь день свободен</p>}

      <ul className={styles.list}>
        {entries.map((entry) =>
          entry.kind === 'timeOff' ? (
            <li key={entry.timeOff.id} className={styles.item} data-kind='time-off'>
              <span className={styles.time}>
                {entry.timeOff.from}–{entry.timeOff.to}
              </span>
              <span className={styles.body}>
                <span className={styles.title}>Время закрыто</span>
                {entry.timeOff.reason && (
                  <span className={styles.detail}>{entry.timeOff.reason}</span>
                )}
              </span>
              <button
                type='button'
                className={styles.remove}
                aria-label={`Открыть время ${entry.timeOff.from}–${entry.timeOff.to}`}
                onClick={() => onRemoveTimeOff(entry.timeOff.id)}
              >
                <X weight='bold' aria-hidden />
              </button>
            </li>
          ) : (
            <li
              key={entry.booking.id}
              className={styles.item}
              data-kind='booking'
              data-cancelled={entry.booking.status === 'cancelled' || undefined}
            >
              <span className={styles.time}>
                {entry.booking.time}–{addMinutes(entry.booking.time, entry.booking.durationMinutes)}
              </span>
              <span className={styles.body}>
                <span className={styles.title}>{entry.booking.serviceName}</span>
                <span className={styles.detail}>
                  {entry.booking.customerName} ·{' '}
                  <a href={`tel:${entry.booking.customerPhone}`} className={styles.phone}>
                    {entry.booking.customerPhone}
                  </a>
                </span>
                {entry.booking.comment && (
                  <span className={styles.comment}>«{entry.booking.comment}»</span>
                )}
                {entry.booking.status === 'cancelled' && (
                  <span className={styles.status}>Отменена</span>
                )}
              </span>
              {entry.booking.status === 'confirmed' && (
                <Dialog>
                  <DialogTrigger
                    render={<Button variant='ghost' size='sm' className={styles.action} />}
                  >
                    Отменить
                  </DialogTrigger>
                  <DialogContent role='alertdialog'>
                    <DialogTitle>Отменить запись?</DialogTitle>
                    <DialogDescription>
                      {entry.booking.customerName}, {entry.booking.serviceName} в{' '}
                      {entry.booking.time}. Клиент получит SMS об отмене.
                    </DialogDescription>
                    <DialogFooter>
                      <DialogClose render={<Button variant='secondary' />}>Оставить</DialogClose>
                      <DialogClose
                        render={
                          <Button
                            variant='danger'
                            onClick={() => onCancelBooking(entry.booking.id)}
                          />
                        }
                      >
                        Отменить запись
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  )
}
