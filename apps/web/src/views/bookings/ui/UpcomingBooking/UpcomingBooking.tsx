'use client'

import {
  ArrowsClockwise,
  CalendarPlus,
  CaretRight,
  DotsThree,
  MapPin,
} from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { downloadCalendarFile, parseBookings, readRaw, Ticket } from '@/entities/booking'
import { WalletButton } from '@/features/addToWallet'
import { RescheduleSheet } from '@/features/rescheduleBooking'
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
  onMoved: (booking: Booking) => void
  onCodeClick: (code: string) => void
}

// One action on the ticket (show it at the door); everything else waits behind «Ещё»,
// in an iOS action sheet, so the ticket stays a ticket.
export const UpcomingBooking = ({
  booking,
  countdown,
  isCancelling,
  onCancel,
  onMoved,
  onCodeClick,
}: UpcomingBookingProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [isTicketOpen, setIsTicketOpen] = useState(false)

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
        onOpen={() => setIsTicketOpen(true)}
        headerAction={
          <button
            type='button'
            className={styles.more}
            aria-label='Ещё'
            onClick={() => setIsMenuOpen(true)}
          >
            <DotsThree weight='bold' aria-hidden />
          </button>
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
              onClick={() => {
                setIsMenuOpen(false)
                setIsMoving(true)
              }}
            >
              <span className={styles.rowLabel}>
                <ArrowsClockwise weight='regular' aria-hidden />
                Перенести
              </span>
              <CaretRight weight='bold' aria-hidden className={styles.chevron} />
            </button>
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
      {isTicketOpen && <TicketViewer booking={booking} onClose={() => setIsTicketOpen(false)} />}
      {isMoving && (
        <RescheduleSheet
          booking={booking}
          token={parseBookings(readRaw()).find((item) => item.id === booking.id)?.token ?? null}
          onMoved={onMoved}
          onClose={() => setIsMoving(false)}
        />
      )}
    </div>
  )
}
