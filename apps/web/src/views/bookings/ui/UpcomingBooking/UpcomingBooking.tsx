'use client'

import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import {
  ArrowsClockwise,
  CalendarPlus,
  CreditCard,
  DotsThree,
  MapPin,
  Phone,
  XCircle,
} from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import {
  downloadCalendarFile,
  formatPrice,
  getDateParts,
  parseBookings,
  readRaw,
} from '@/entities/booking'
import { WalletButton } from '@/features/addToWallet'
import { RescheduleSheet } from '@/features/rescheduleBooking'
import { TicketViewer } from '@/features/ticketView'
import { getErrorMessage } from '@/shared/api/apiError'
import { getCheckoutUrl } from '@/shared/api/clientApi'
import type { Booking } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { trackStep } from '@/shared/lib/telemetry'
import styles from './UpcomingBooking.module.css'

interface UpcomingBookingProps {
  booking: Booking
  countdown: string
  isCancelling: boolean
  onCancel: () => void
  onMoved: (booking: Booking) => void
  /**
   * `next` - the nearest visit, large, its everyday actions in plain sight (route, call, move);
   * `row` - a later visit, one quiet line, every action behind «⋯».
   */
  variant?: 'next' | 'row'
}

// Upcoming visits as passes, not full tickets: the ticket with every detail opens on tap. The
// nearest visit is large with its everyday actions in plain sight (route, call, move); later ones
// are one quiet row each, their actions in «⋯» («профиль должен быть самой удобной частью»).
export const UpcomingBooking = ({
  booking,
  countdown,
  isCancelling,
  onCancel,
  onMoved,
  variant = 'next',
}: UpcomingBookingProps) => {
  const t = useT()
  const [isMoving, setIsMoving] = useState(false)
  const [isTicketOpen, setIsTicketOpen] = useState(false)
  const { day } = getDateParts(booking.date)
  const month = t.monthShort(booking.date)
  const code = booking.id.replace(/-/g, '').slice(0, 8).toUpperCase()
  const isAwaitingPayment = booking.status === 'confirmed' && booking.payment?.status === 'pending'
  const toast = useToast()
  const isRow = variant === 'row'
  const isConfirmed = booking.status === 'confirmed'
  const phone = booking.business.phone
  const openMap = () => window.open(booking.business.mapUrl ?? '', '_blank', 'noreferrer')
  const startMoving = () => {
    setIsMoving(true)
    trackStep('reschedule_open', booking.business.slug)
  }

  // The slot is held until the deposit is paid: back to the same checkout.
  const handlePay = async () => {
    try {
      const token = parseBookings(readRaw()).find((item) => item.id === booking.id)?.token ?? null
      const { url } = await getCheckoutUrl(booking.id, token)
      window.location.assign(url)
    } catch (payError) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(payError),
        type: 'error',
      })
    }
  }

  return (
    <div className={styles.item}>
      {/* A compact pass: when, what, where. The full ticket opens on tap. */}
      <article
        className={styles.card}
        data-status={booking.status}
        data-variant={variant}
        aria-label={t('Booking {code}', { code })}
      >
        <button
          type='button'
          className={styles.open}
          onClick={() => {
            setIsTicketOpen(true)
            trackStep('ticket_open', booking.business.slug)
          }}
          aria-label={t('Show the ticket')}
        />
        <span className={styles.leaf} aria-hidden='true'>
          <span className={styles.leafMonth}>{month}</span>
          <span className={styles.leafDay}>{day}</span>
        </span>
        <span className={styles.body}>
          <span className={styles.when}>
            {booking.time}
            <span className={styles.countdown} data-pending={isAwaitingPayment || undefined}>
              {booking.status === 'cancelled'
                ? t('Cancelled')
                : isAwaitingPayment
                  ? t('Awaiting payment')
                  : countdown}
            </span>
          </span>
          <span className={styles.service}>{booking.serviceName}</span>
          <span className={styles.meta}>
            {booking.specialistName} · {booking.business.name}
          </span>
        </span>
        <Menu label={t('More')} className={styles.more} trigger={<DotsThree aria-hidden />}>
          {/* A later visit keeps all its actions here; the nearest one shows the everyday ones. */}
          {isRow && isConfirmed && !isAwaitingPayment && (
            <MenuItem icon={<ArrowsClockwise aria-hidden />} onClick={startMoving}>
              {t('Reschedule')}
            </MenuItem>
          )}
          {isRow && booking.business.mapUrl && (
            <MenuItem icon={<MapPin aria-hidden />} onClick={openMap}>
              {t('Directions')}
            </MenuItem>
          )}
          {isConfirmed && !isAwaitingPayment && (
            <MenuItem
              icon={<CalendarPlus aria-hidden />}
              onClick={() => downloadCalendarFile(booking, booking.business)}
            >
              {t('To calendar')}
            </MenuItem>
          )}
          {isConfirmed && (
            <MenuItem
              variant='danger'
              icon={<XCircle aria-hidden />}
              disabled={isCancelling}
              onClick={onCancel}
            >
              {isCancelling ? t('Cancelling…') : t('Cancel booking')}
            </MenuItem>
          )}
        </Menu>
        {isConfirmed && (isAwaitingPayment || !isRow) && (
          <span className={styles.links}>
            {/* Unpaid: the one thing to do is pay; moving and the calendar wait for it. */}
            {isAwaitingPayment ? (
              <button type='button' className={styles.link} onClick={() => void handlePay()}>
                <CreditCard aria-hidden />
                {t('Pay {amount}', { amount: formatPrice(booking.payment?.amount ?? 0) })}
              </button>
            ) : (
              <>
                {booking.business.mapUrl && (
                  <button type='button' className={styles.link} onClick={openMap}>
                    <MapPin aria-hidden />
                    {t('Directions')}
                  </button>
                )}
                {phone && (
                  <a className={styles.link} href={`tel:${phone}`}>
                    <Phone aria-hidden />
                    {t('Call')}
                  </a>
                )}
                <button type='button' className={styles.link} onClick={startMoving}>
                  <ArrowsClockwise aria-hidden />
                  {t('Reschedule')}
                </button>
              </>
            )}
          </span>
        )}
      </article>
      {isTicketOpen && (
        <TicketViewer
          booking={booking}
          onClose={() => setIsTicketOpen(false)}
          extra={<WalletButton bookingId={booking.id} />}
        />
      )}
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
