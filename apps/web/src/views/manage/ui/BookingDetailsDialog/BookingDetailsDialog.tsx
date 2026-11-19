import { CaretRight, XCircle } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { formatDuration, formatPrice, getDateParts, PAYMENT_STATUS_TEXT } from '@/entities/booking'
import { addMinutes, PersonAvatar } from '@/entities/business'
import type { AdminBooking, OutcomeInput } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import { ContactRows } from '@/shared/ui/ContactRows/ContactRows'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './BookingDetailsDialog.module.css'
import { VisitOutcomeSection } from './VisitOutcomeSection'

interface BookingDetailsDialogProps {
  /** The business, for the client's loyalty in «Итог визита». */
  slug: string
  booking: AdminBooking
  onClose: () => void
  onCancel: (id: string) => Promise<boolean>
  /** Set once the visit's day has come: staff can mark it. */
  onOutcome?: (id: string, input: OutcomeInput) => Promise<AdminBooking | null>
  onOpenClient: (phone: string) => void
}

const DAY_MS = 86_400_000
const RELATIVE: Record<number, string> = { [-1]: 'вчера', 0: 'сегодня', 1: 'завтра' }

const relativeDay = (dayKey: string, todayKey: string | undefined) => {
  if (!todayKey) return null
  const days = Math.round(
    (Date.parse(`${dayKey}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / DAY_MS,
  )
  return RELATIVE[days] ?? null
}

// The visit as the same e-ticket the client holds: the day as a calendar leaf beside the time,
// the service and master, a tear line, the client with ways to reach them, another tear line and
// the stub with what to pay. Under the ticket: the visit's outcome and the comment.
export const BookingDetailsDialog = ({
  slug,
  booking,
  onClose,
  onCancel,
  onOutcome,
  onOpenClient,
}: BookingDetailsDialogProps) => {
  const [isCancelling, setIsCancelling] = useState(false)
  const today = useToday()
  const isCancelled = booking.status === 'cancelled'
  const { day, month, weekday } = getDateParts(booking.date)
  const relative = relativeDay(booking.date, today?.dayKey)
  const total = booking.price - (booking.discount?.amount ?? 0)

  const handleCancel = async () => {
    setIsCancelling(true)
    if (await onCancel(booking.id)) onClose()
    setIsCancelling(false)
  }

  return (
    <Sheet
      title='Запись'
      onClose={onClose}
      cancelLabel={null}
      action={{ label: 'Готово', onClick: onClose }}
    >
      <article
        className={styles.ticket}
        aria-label='Запись'
        data-cancelled={isCancelled || undefined}
      >
        <div className={styles.part} data-cut='bottom'>
          <div className={styles.when}>
            <span className={styles.leaf} aria-hidden>
              <span className={styles.leafMonth}>{month}</span>
              <span className={styles.leafDay}>{day}</span>
            </span>
            <span className={styles.whenText}>
              <span className={styles.time}>
                {booking.time}–{addMinutes(booking.time, booking.durationMinutes)}
              </span>
              <span className={styles.day}>
                {weekday.toLowerCase()}
                {relative && ` · ${relative}`}
              </span>
            </span>
            {isCancelled && <span className={styles.status}>Отменена</span>}
          </div>
          <div className={styles.service}>
            <p className={styles.serviceName}>{booking.serviceName}</p>
            <p className={styles.serviceMeta}>
              {booking.specialistName} · {formatDuration(booking.durationMinutes)}
            </p>
          </div>
        </div>

        <div className={styles.part} data-cut='both'>
          <div className={styles.client}>
            <button
              type='button'
              className={styles.clientButton}
              onClick={() => onOpenClient(booking.customerPhone)}
            >
              <PersonAvatar name={booking.customerName} size='md' />
              <span className={styles.clientText}>
                <span className={styles.clientName}>
                  {booking.customerName}
                  <CaretRight weight='bold' aria-hidden className={styles.chevron} />
                </span>
                <span className={styles.clientPhone}>Карточка клиента</span>
              </span>
            </button>
          </div>
        </div>

        <div className={styles.part} data-cut='top'>
          <div className={styles.stub}>
            <div className={styles.stubRow}>
              <span className={styles.stubLabel}>К оплате</span>
              <span className={styles.total}>
                {booking.discount && (
                  <s className={styles.oldPrice}>{formatPrice(booking.price)}</s>
                )}
                {formatPrice(total)}
              </span>
            </div>
            {booking.discount && (
              <p className={styles.stubNote}>
                {booking.discount.title} · −{formatPrice(booking.discount.amount)}
              </p>
            )}
            {booking.payment && (
              <p className={styles.stubNote}>
                Предоплата {formatPrice(booking.payment.amount)} ·{' '}
                {PAYMENT_STATUS_TEXT[booking.payment.status]}
              </p>
            )}
          </div>
        </div>
      </article>

      <ContactRows phone={booking.customerPhone} />

      {!isCancelled && onOutcome && (
        <VisitOutcomeSection
          slug={slug}
          booking={booking}
          onChange={(input) => onOutcome(booking.id, input)}
        />
      )}

      {booking.comment && (
        <section className={sheet.group} aria-label='Комментарий'>
          <SectionCaption>Комментарий клиента</SectionCaption>
          <p className={styles.comment}>{booking.comment}</p>
        </section>
      )}

      {!isCancelled && (
        <HoldButton
          icon={<XCircle weight='bold' aria-hidden />}
          onConfirm={() => void handleCancel()}
          disabled={isCancelling}
        >
          Отменить запись
        </HoldButton>
      )}
    </Sheet>
  )
}
