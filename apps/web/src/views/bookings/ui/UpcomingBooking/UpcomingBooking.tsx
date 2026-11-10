'use client'

import { CalendarPlus, CaretRight, DotsThree, MapPin } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { downloadCalendarFile, Ticket } from '@/entities/booking'
import { WalletButton } from '@/features/addToWallet'
import { TicketViewer } from '@/features/ticketView'
import type { Booking } from '@/shared/api/types'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './UpcomingBooking.module.css'

interface UpcomingBookingProps {
  booking: Booking
  countdown: string
  isCancelling: boolean
  onCancel: () => void
  onCodeClick: (code: string) => void
}

// One action on the ticket (show it at the door); everything else waits behind «Ещё»,
// in an iOS action sheet, so the ticket stays a ticket.
export const UpcomingBooking = ({
  booking,
  countdown,
  isCancelling,
  onCancel,
  onCodeClick,
}: UpcomingBookingProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleCancel = () => {
    setIsMenuOpen(false)
    onCancel()
  }

  return (
    <div className={styles.item}>
      <p className={styles.countdown}>{countdown}</p>
      <Ticket
        booking={booking}
        onCodeClick={onCodeClick}
        footer={
          <div className={styles.actions}>
            <TicketViewer booking={booking} />
            <button
              type='button'
              className={styles.more}
              aria-label='Ещё'
              onClick={() => setIsMenuOpen(true)}
            >
              <DotsThree weight='bold' aria-hidden />
            </button>
          </div>
        }
      />
      {isMenuOpen && (
        <Sheet title='Запись' cancelLabel='Готово' onClose={() => setIsMenuOpen(false)}>
          <div className={styles.wallet}>
            <WalletButton bookingId={booking.id} />
          </div>
          <div className={sheet.list}>
            <button
              type='button'
              className={sheet.row}
              onClick={() => downloadCalendarFile(booking, booking.business)}
            >
              <span className={styles.rowLabel}>
                <CalendarPlus weight='regular' aria-hidden />В календарь
              </span>
              <CaretRight weight='bold' aria-hidden className={styles.chevron} />
            </button>
            {booking.business.mapUrl && (
              <a
                href={booking.business.mapUrl}
                target='_blank'
                rel='noreferrer'
                className={sheet.row}
              >
                <span className={styles.rowLabel}>
                  <MapPin weight='regular' aria-hidden />
                  Маршрут
                </span>
                <CaretRight weight='bold' aria-hidden className={styles.chevron} />
              </a>
            )}
          </div>
          <div className={sheet.list}>
            <button
              type='button'
              className={sheet.danger}
              disabled={isCancelling}
              onClick={handleCancel}
            >
              {isCancelling ? 'Отменяем…' : 'Отменить запись'}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
