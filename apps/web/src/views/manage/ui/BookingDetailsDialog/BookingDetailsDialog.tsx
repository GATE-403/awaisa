import type { AdminBooking, OutcomeInput } from '@/shared/api/types'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import { BookingInspector } from '@/views/manage/ui/BookingInspector/BookingInspector'

interface BookingDetailsDialogProps {
  /** The business, for the client's loyalty in «Итог визита». */
  slug: string
  booking: AdminBooking
  onClose: () => void
  onCancel: (id: string) => Promise<boolean>
  /** Set once the visit's day has come: staff can mark it. */
  onOutcome?: (id: string, input: OutcomeInput) => Promise<AdminBooking | null>
  onOpenClient: (phone: string) => void
  onBookAgain?: (booking: AdminBooking) => void
}

// On touch screens the visit opens as a compact sheet with the same inspector the desktop shows in
// a popover beside the card (no e-ticket: that is the client's own view).
export const BookingDetailsDialog = ({
  slug,
  booking,
  onClose,
  onCancel,
  onOutcome,
  onOpenClient,
  onBookAgain,
}: BookingDetailsDialogProps) => (
  <Sheet
    title='Запись'
    onClose={onClose}
    cancelLabel={null}
    action={{ label: 'Готово', onClick: onClose }}
  >
    <BookingInspector
      slug={slug}
      booking={booking}
      onCancel={onCancel}
      onOutcome={onOutcome}
      onOpenClient={onOpenClient}
      onBookAgain={onBookAgain}
      onClose={onClose}
    />
  </Sheet>
)
