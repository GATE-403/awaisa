import { Avatar } from '@awaisa/ui/Avatar'
import { ChatCircle, Phone, WhatsappLogo } from '@phosphor-icons/react/ssr'
import { type CSSProperties, useState } from 'react'
import { formatDuration, formatPrice, PAYMENT_STATUS_TEXT } from '@/entities/booking'
import { addMinutes } from '@/entities/business'
import type { AdminBooking, OutcomeInput } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './BookingDetailsDialog.module.css'
import { VisitOutcomeSection } from './VisitOutcomeSection'

interface BookingDetailsDialogProps {
  booking: AdminBooking
  tint: string
  dayLabel: string
  onClose: () => void
  onCancel: (id: string) => Promise<boolean>
  /** Set once the visit's day has come: staff can mark it. */
  onOutcome?: (id: string, input: OutcomeInput) => Promise<AdminBooking | null>
  onOpenClient: (phone: string) => void
}

export const BookingDetailsDialog = ({
  booking,
  tint,
  dayLabel,
  onClose,
  onCancel,
  onOutcome,
  onOpenClient,
}: BookingDetailsDialogProps) => {
  const [isCancelling, setIsCancelling] = useState(false)
  const isCancelled = booking.status === 'cancelled'
  const digits = booking.customerPhone.replace(/\D/g, '')
  const contactActions = [
    { href: `tel:${booking.customerPhone}`, label: 'Позвонить', icon: Phone },
    { href: `https://wa.me/${digits}`, label: 'WhatsApp', icon: WhatsappLogo, external: true },
    { href: `sms:${booking.customerPhone}`, label: 'SMS', icon: ChatCircle },
  ]

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
      <div
        className={styles.hero}
        style={{ '--tint': tint } as CSSProperties}
        data-cancelled={isCancelled || undefined}
      >
        <p className={styles.heroDay}>
          {dayLabel}
          {isCancelled && <span className={styles.status}>Отменена</span>}
        </p>
        <p className={styles.heroTime}>
          {booking.time}–{addMinutes(booking.time, booking.durationMinutes)}
        </p>
        <p className={styles.heroService}>{booking.serviceName}</p>
        <p className={styles.heroMeta}>
          {booking.specialistName} · {formatDuration(booking.durationMinutes)}
        </p>
      </div>

      <section className={styles.client} aria-label='Клиент'>
        <Avatar name={booking.customerName} size='lg' />
        <div className={styles.clientText}>
          <p className={styles.clientName}>{booking.customerName}</p>
          <p className={styles.clientPhone}>{formatPhone(booking.customerPhone)}</p>
          <button
            type='button'
            className={styles.clientLink}
            onClick={() => onOpenClient(booking.customerPhone)}
          >
            Карточка клиента ›
          </button>
        </div>
      </section>
      <div className={styles.actions}>
        {contactActions.map(({ href, label, icon: Icon, external }) => (
          <a
            key={label}
            href={href}
            className={styles.action}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            <span className={styles.actionIcon}>
              <Icon weight='fill' aria-hidden />
            </span>
            {label}
          </a>
        ))}
      </div>

      <div className={sheet.list}>
        <div className={sheet.row}>
          <span className={sheet.rowLabel}>Стоимость</span>
          <span className={styles.value}>{formatPrice(booking.price)}</span>
        </div>
        {booking.payment && (
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>Предоплата</span>
            <span className={styles.value}>
              {formatPrice(booking.payment.amount)} · {PAYMENT_STATUS_TEXT[booking.payment.status]}
            </span>
          </div>
        )}
      </div>

      {!isCancelled && onOutcome && (
        <VisitOutcomeSection booking={booking} onChange={(input) => onOutcome(booking.id, input)} />
      )}

      {booking.comment && (
        <section className={sheet.group} aria-label='Комментарий'>
          <h3 className={sheet.groupTitle}>Комментарий клиента</h3>
          <p className={styles.comment}>{booking.comment}</p>
        </section>
      )}

      {!isCancelled && (
        <div className={sheet.list}>
          <button
            type='button'
            className={sheet.danger}
            onClick={handleCancel}
            disabled={isCancelling}
          >
            Отменить запись
          </button>
        </div>
      )}
    </Sheet>
  )
}
