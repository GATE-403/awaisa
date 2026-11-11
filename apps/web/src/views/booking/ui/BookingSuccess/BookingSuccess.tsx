'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { CalendarPlus, MapPin } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useState } from 'react'
import { downloadCalendarFile, Ticket } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { TicketViewer } from '@/features/ticketView'
import type { Booking } from '@/shared/api/types'
import styles from './BookingSuccess.module.css'

interface BookingSuccessProps {
  booking: Booking
}

export const BookingSuccess = ({ booking }: BookingSuccessProps) => {
  const toast = useToast()
  const session = useSession()
  const [isTicketOpen, setIsTicketOpen] = useState(false)

  const handleAddToCalendar = () => {
    downloadCalendarFile(booking, booking.business)
    toast.show({
      title: 'Событие для календаря готово',
      description: 'Откройте файл, чтобы добавить',
    })
  }

  return (
    <div className={styles.success}>
      <h1 className={styles.title}>Вы записаны</h1>
      <p className={styles.lead}>Нажмите на талон, чтобы увидеть всё о визите.</p>
      {/* The ticket itself opens the full one: details, place, download. */}
      <button
        type='button'
        className={styles.ticket}
        onClick={() => setIsTicketOpen(true)}
        aria-label='Показать талон'
      >
        <Ticket booking={booking} />
      </button>
      <div className={styles.chips}>
        <Button size='sm' variant='secondary' onClick={handleAddToCalendar}>
          <CalendarPlus weight='bold' className={styles.chipIcon} aria-hidden />В календарь
        </Button>
        {booking.business.mapUrl && (
          <ButtonLink
            size='sm'
            variant='secondary'
            render={
              // biome-ignore lint/a11y/useAnchorContent: content comes from Button children via render
              <a href={booking.business.mapUrl} target='_blank' rel='noreferrer' />
            }
          >
            <MapPin weight='bold' className={styles.chipIcon} aria-hidden />
            Маршрут
          </ButtonLink>
        )}
      </div>
      <div className={styles.primary}>
        <ButtonLink render={<NextLink href='/bookings' />} size='lg' fullWidth>
          Мои записи
        </ButtonLink>
      </div>
      {/* Guests keep bookings on this device only: say so at the moment it matters. */}
      {session.status === 'guest' && (
        <p className={styles.keep}>
          Запись сохранена на этом телефоне.{' '}
          <NextLink href='/login?next=/bookings' className={styles.keepLink}>
            Войдите по номеру
          </NextLink>
          , чтобы видеть записи на любом устройстве.
        </p>
      )}
      {isTicketOpen && <TicketViewer booking={booking} onClose={() => setIsTicketOpen(false)} />}
    </div>
  )
}
