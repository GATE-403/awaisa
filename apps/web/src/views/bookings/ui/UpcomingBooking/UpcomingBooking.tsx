'use client'

import {
  ArrowsClockwise,
  CalendarPlus,
  CaretRight,
  DotsThree,
  MapPin,
} from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { downloadCalendarFile, getDateParts, parseBookings, readRaw } from '@/entities/booking'
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
}

// Upcoming visits as compact passes, not full tickets: the list stays short; the ticket with
// every detail opens on tap, rarer actions wait behind «Ещё».
export const UpcomingBooking = ({
  booking,
  countdown,
  isCancelling,
  onCancel,
  onMoved,
}: UpcomingBookingProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [isTicketOpen, setIsTicketOpen] = useState(false)
  const { day, month } = getDateParts(booking.date)
  const code = booking.id.replace(/-/g, '').slice(0, 8).toUpperCase()

  const handleCancel = () => {
    setIsMenuOpen(false)
    onCancel()
  }

  return (
    <div className={styles.item}>
      {/* A compact pass: when, what, where. The full ticket opens on tap. */}
      <article className={styles.card} data-status={booking.status} aria-label={`Запись ${code}`}>
        <button
          type='button'
          className={styles.open}
          onClick={() => setIsTicketOpen(true)}
          aria-label='Показать талон'
        />
        <span className={styles.leaf} aria-hidden='true'>
          <span className={styles.leafMonth}>{month}</span>
          <span className={styles.leafDay}>{day}</span>
        </span>
        <span className={styles.body}>
          <span className={styles.when}>
            {booking.time}
            <span className={styles.countdown}>
              {booking.status === 'cancelled' ? 'Отменена' : countdown}
            </span>
          </span>
          <span className={styles.service}>{booking.serviceName}</span>
          <span className={styles.meta}>
            {booking.specialistName} · {booking.business.name}
          </span>
        </span>
        <button
          type='button'
          className={styles.more}
          aria-label='Ещё'
          onClick={() => setIsMenuOpen(true)}
        >
          <DotsThree weight='bold' aria-hidden />
        </button>
        {booking.status === 'confirmed' && (
          <span className={styles.links}>
            <button type='button' className={styles.link} onClick={() => setIsMoving(true)}>
              <ArrowsClockwise weight='bold' aria-hidden />
              Перенести
            </button>
            <button
              type='button'
              className={styles.link}
              onClick={() => downloadCalendarFile(booking, booking.business)}
            >
              <CalendarPlus weight='bold' aria-hidden />В календарь
            </button>
          </span>
        )}
      </article>
      {isMenuOpen && (
        <Sheet title='Запись' cancelLabel='Готово' onClose={() => setIsMenuOpen(false)}>
          <div className={styles.wallet}>
            <WalletButton bookingId={booking.id} />
          </div>
          <div className={sheet.list}>
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
