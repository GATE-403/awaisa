'use client'

import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import {
  ArrowsClockwise,
  CalendarPlus,
  CreditCard,
  DotsThree,
  MapPin,
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
}

// Upcoming visits as compact passes, not full tickets: the list stays short; the ticket with
// every detail opens on tap, rarer actions wait in the «⋯» pull-down menu.
export const UpcomingBooking = ({
  booking,
  countdown,
  isCancelling,
  onCancel,
  onMoved,
}: UpcomingBookingProps) => {
  const t = useT()
  const [isMoving, setIsMoving] = useState(false)
  const [isTicketOpen, setIsTicketOpen] = useState(false)
  const { day } = getDateParts(booking.date)
  const month = t.monthShort(booking.date)
  const code = booking.id.replace(/-/g, '').slice(0, 8).toUpperCase()
  const isAwaitingPayment = booking.status === 'confirmed' && booking.payment?.status === 'pending'
  const toast = useToast()

  // The slot is held until the deposit is paid: back to the same checkout.
  const handlePay = async () => {
    try {
      const token = parseBookings(readRaw()).find((item) => item.id === booking.id)?.token ?? null
      const { url } = await getCheckoutUrl(booking.id, token)
      window.location.assign(url)
    } catch (payError) {
      toast.show({
        title: t('Не получилось'),
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
        aria-label={t('Запись {code}', { code })}
      >
        <button
          type='button'
          className={styles.open}
          onClick={() => {
            setIsTicketOpen(true)
            trackStep('ticket_open', booking.business.slug)
          }}
          aria-label={t('Показать талон')}
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
                ? t('Отменена')
                : isAwaitingPayment
                  ? t('Ждёт оплаты')
                  : countdown}
            </span>
          </span>
          <span className={styles.service}>{booking.serviceName}</span>
          <span className={styles.meta}>
            {booking.specialistName} · {booking.business.name}
          </span>
        </span>
        <Menu
          label={t('Ещё')}
          className={styles.more}
          trigger={<DotsThree weight='bold' aria-hidden />}
        >
          {booking.business.mapUrl && (
            <MenuItem
              icon={<MapPin aria-hidden />}
              onClick={() => window.open(booking.business.mapUrl ?? '', '_blank', 'noreferrer')}
            >
              {t('Маршрут')}
            </MenuItem>
          )}
          {booking.status === 'confirmed' && (
            <MenuItem
              variant='danger'
              icon={<XCircle aria-hidden />}
              disabled={isCancelling}
              onClick={onCancel}
            >
              {isCancelling ? t('Отменяем…') : t('Отменить запись')}
            </MenuItem>
          )}
        </Menu>
        {booking.status === 'confirmed' && (
          <span className={styles.links}>
            {/* Unpaid: the one thing to do is pay; moving and the calendar wait for it. */}
            {isAwaitingPayment ? (
              <button type='button' className={styles.link} onClick={() => void handlePay()}>
                <CreditCard weight='bold' aria-hidden />
                {t('Оплатить {amount}', { amount: formatPrice(booking.payment?.amount ?? 0) })}
              </button>
            ) : (
              <>
                <button
                  type='button'
                  className={styles.link}
                  onClick={() => {
                    setIsMoving(true)
                    trackStep('reschedule_open', booking.business.slug)
                  }}
                >
                  <ArrowsClockwise weight='bold' aria-hidden />
                  {t('Перенести')}
                </button>
                <button
                  type='button'
                  className={styles.link}
                  onClick={() => downloadCalendarFile(booking, booking.business)}
                >
                  <CalendarPlus weight='bold' aria-hidden />
                  {t('В календарь')}
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
