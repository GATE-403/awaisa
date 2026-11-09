import { Avatar } from '@awaisa/ui/Avatar'
import { Button } from '@awaisa/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@awaisa/ui/Dialog'
import { ChatCircle, Phone, WhatsappLogo } from '@phosphor-icons/react/ssr'
import { type CSSProperties, useState } from 'react'
import type { AdminBooking } from '@/common/api/types'
import { Sheet } from '@/common/components/Sheet/Sheet'
import sheet from '@/common/components/Sheet/Sheet.module.css'
import { formatPhone } from '@/common/utils/formatPhone'
import { formatDuration, formatPrice } from '@/features/booking/bookingUtils'
import { addMinutes } from '../../manageUtils'
import styles from './BookingDetailsDialog.module.css'

interface BookingDetailsDialogProps {
  booking: AdminBooking
  tint: string
  dayLabel: string
  onClose: () => void
  onCancel: (id: string) => Promise<boolean>
}

export const BookingDetailsDialog = ({
  booking,
  tint,
  dayLabel,
  onClose,
  onCancel,
}: BookingDetailsDialogProps) => {
  const [isConfirming, setIsConfirming] = useState(false)
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

  if (isConfirming) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent role='alertdialog'>
          <DialogTitle>Отменить запись?</DialogTitle>
          <DialogDescription>
            {booking.customerName}, {booking.serviceName} в {booking.time}. Клиент получит SMS об
            отмене.
          </DialogDescription>
          <DialogFooter>
            <Button variant='secondary' onClick={() => setIsConfirming(false)}>
              Оставить
            </Button>
            <Button variant='danger' onClick={handleCancel} disabled={isCancelling}>
              Отменить запись
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
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
        <div className={sheet.row}>
          <span className={sheet.rowLabel}>Оплата</span>
          <span className={styles.muted}>В салоне</span>
        </div>
      </div>

      {booking.comment && (
        <section className={sheet.group} aria-label='Комментарий'>
          <h3 className={sheet.groupTitle}>Комментарий клиента</h3>
          <p className={styles.comment}>{booking.comment}</p>
        </section>
      )}

      {!isCancelled && (
        <div className={sheet.list}>
          <button type='button' className={sheet.danger} onClick={() => setIsConfirming(true)}>
            Отменить запись
          </button>
        </div>
      )}
    </Sheet>
  )
}
