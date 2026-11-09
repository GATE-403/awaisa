import { Button } from '@awaisa/ui/Button'

interface CancelBookingButtonProps {
  isCancelling: boolean
  onConfirm: () => void
}

// No confirmation: cancelling is reversible from the toast («Вернуть»), like deleting mail on iOS.
export const CancelBookingButton = ({ isCancelling, onConfirm }: CancelBookingButtonProps) => (
  <Button variant='ghost' size='sm' disabled={isCancelling} onClick={onConfirm}>
    {isCancelling ? 'Отменяем…' : 'Отменить запись'}
  </Button>
)
