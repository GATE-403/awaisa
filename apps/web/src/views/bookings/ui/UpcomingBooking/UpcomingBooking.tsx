import { Button, ButtonLink } from '@awaisa/ui/Button'
import { CalendarPlus, MapPin } from '@phosphor-icons/react/ssr'
import { downloadCalendarFile, Ticket } from '@/entities/booking'
import { WalletButton } from '@/features/addToWallet'
import { CancelBookingButton } from '@/features/cancelBooking'
import { TicketViewer } from '@/features/ticketView'
import type { Booking } from '@/shared/api/types'
import styles from './UpcomingBooking.module.css'

interface UpcomingBookingProps {
  booking: Booking
  countdown: string
  isCancelling: boolean
  onCancel: () => void
  onCodeClick: (code: string) => void
}

export const UpcomingBooking = ({
  booking,
  countdown,
  isCancelling,
  onCancel,
  onCodeClick,
}: UpcomingBookingProps) => (
  <div className={styles.item}>
    <p className={styles.countdown}>{countdown}</p>
    <Ticket
      booking={booking}
      onCodeClick={onCodeClick}
      footer={
        <div className={styles.actions}>
          <TicketViewer booking={booking} />
          <WalletButton bookingId={booking.id} />
          <Button
            variant='secondary'
            size='sm'
            onClick={() => downloadCalendarFile(booking, booking.business)}
          >
            <CalendarPlus weight='bold' aria-hidden />В календарь
          </Button>
          {booking.business.mapUrl && (
            <ButtonLink
              variant='secondary'
              size='sm'
              render={
                // biome-ignore lint/a11y/useAnchorContent: content comes from ButtonLink children via render
                <a href={booking.business.mapUrl} target='_blank' rel='noreferrer' />
              }
            >
              <MapPin weight='bold' aria-hidden />
              Маршрут
            </ButtonLink>
          )}
          <span className={styles.spacer} />
          <CancelBookingButton isCancelling={isCancelling} onConfirm={onCancel} />
        </div>
      }
    />
  </div>
)
