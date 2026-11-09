import { Button, ButtonLink } from '@awaisa/ui/Button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@awaisa/ui/Dialog'
import { useState } from 'react'
import type { AdminBooking } from '@/common/api/types'
import { formatPhone } from '@/common/utils/formatPhone'
import { formatDuration, formatPrice } from '@/features/booking/bookingUtils'
import { addMinutes } from '../../manageUtils'
import styles from './BookingDetailsDialog.module.css'

interface BookingDetailsDialogProps {
  booking: AdminBooking
  onClose: () => void
  onCancel: (id: string) => Promise<boolean>
}

export const BookingDetailsDialog = ({ booking, onClose, onCancel }: BookingDetailsDialogProps) => {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const isCancelled = booking.status === 'cancelled'

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <p className={styles.eyebrow}>
          {booking.time}–{addMinutes(booking.time, booking.durationMinutes)}
          {isCancelled && <span className={styles.cancelled}> · Отменена</span>}
        </p>
        <DialogTitle>{booking.serviceName}</DialogTitle>
        <dl className={styles.details}>
          <div className={styles.row}>
            <dt>Клиент</dt>
            <dd>{booking.customerName}</dd>
          </div>
          <div className={styles.row}>
            <dt>Телефон</dt>
            <dd>
              <a href={`tel:${booking.customerPhone}`}>{formatPhone(booking.customerPhone)}</a>
            </dd>
          </div>
          <div className={styles.row}>
            <dt>Мастер</dt>
            <dd>{booking.specialistName}</dd>
          </div>
          <div className={styles.row}>
            <dt>Длительность</dt>
            <dd>{formatDuration(booking.durationMinutes)}</dd>
          </div>
          <div className={styles.row}>
            <dt>Стоимость</dt>
            <dd>{formatPrice(booking.price)}</dd>
          </div>
          {booking.comment && (
            <div className={styles.row}>
              <dt>Комментарий</dt>
              <dd>{booking.comment}</dd>
            </div>
          )}
        </dl>
        <DialogFooter>
          {isCancelled ? (
            <DialogClose render={<Button variant='secondary' />}>Закрыть</DialogClose>
          ) : (
            <>
              <Button variant='secondary' onClick={() => setIsConfirming(true)}>
                Отменить запись
              </Button>
              <ButtonLink
                // biome-ignore lint/a11y/useAnchorContent: content comes from ButtonLink children via render
                render={<a href={`tel:${booking.customerPhone}`} />}
              >
                Позвонить
              </ButtonLink>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
