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
import type { Booking } from '@/common/api/types'
import { formatDayLong } from '@/features/booking/bookingUtils'

interface CancelBookingButtonProps {
  booking: Booking
  isCancelling: boolean
  onConfirm: () => void
}

export const CancelBookingButton = ({
  booking,
  isCancelling,
  onConfirm,
}: CancelBookingButtonProps) => (
  <Dialog>
    <DialogTrigger render={<Button variant='ghost' size='sm' disabled={isCancelling} />}>
      {isCancelling ? 'Отменяем…' : 'Отменить запись'}
    </DialogTrigger>
    <DialogContent role='alertdialog'>
      <DialogTitle>Отменить запись?</DialogTitle>
      <DialogDescription>
        {booking.serviceName}, {formatDayLong(booking.date)} в {booking.time}. Время освободится для
        других клиентов.
      </DialogDescription>
      <DialogFooter>
        <DialogClose render={<Button variant='secondary' />}>Оставить</DialogClose>
        <DialogClose render={<Button variant='danger' onClick={onConfirm} />}>
          Отменить запись
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
