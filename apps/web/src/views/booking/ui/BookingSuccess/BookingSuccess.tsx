'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { CalendarPlus, Check, MapPin, Ticket as TicketIcon } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useState } from 'react'
import { downloadCalendarFile, formatDayLong, Ticket } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { ForYouShelf } from '@/features/forYou'
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
      {/* A confirmation like Apple Pay's: a green check, the words, then the one fact that
          matters — when. */}
      <span className={styles.check} aria-hidden>
        <Check weight='bold' />
      </span>
      <h1 className={styles.title}>Вы записаны</h1>
      <p className={styles.lead}>
        {formatDayLong(booking.date)} в {booking.time} · {booking.business.name}
      </p>
      {/* What to do now, in plain words: someone new to this does not read a barcode. */}
      <p className={styles.nextStep}>
        Приходите к {booking.time}
        {booking.business.address ? ` по адресу ${booking.business.address}` : ''}.{' '}
        {booking.payment?.status === 'paid' ? 'Остаток оплатите в салоне.' : 'Оплата в салоне.'}{' '}
        Перенести или отменить можно по ссылке из SMS.
      </p>
      {/* The ticket itself opens the full one: details, place, download. */}
      <button
        type='button'
        className={styles.ticket}
        onClick={() => setIsTicketOpen(true)}
        aria-label='Показать талон'
      >
        <Ticket booking={booking} />
      </button>
      {/* Next steps as three equal tiles, icon over word, like a share sheet's row. */}
      <div className={styles.tiles}>
        <button type='button' className={styles.tile} onClick={handleAddToCalendar}>
          <CalendarPlus weight='bold' aria-hidden />В календарь
        </button>
        {booking.business.mapUrl ? (
          <a
            href={booking.business.mapUrl}
            target='_blank'
            rel='noreferrer'
            className={styles.tile}
          >
            <MapPin weight='bold' aria-hidden />
            Маршрут
          </a>
        ) : null}
        <button type='button' className={styles.tile} onClick={() => setIsTicketOpen(true)}>
          <TicketIcon weight='bold' aria-hidden />
          Талон
        </button>
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
      {/* What to look at next, chosen from this visit and the client's answers — a reason to
          keep browsing rather than a push back to the catalog. */}
      <div className={styles.next}>
        <ForYouShelf
          surface='success'
          title='Вам может понравиться'
          seedVisit={`${booking.serviceId}~${booking.startsAt.slice(0, 10)}`}
          excludeServiceId={booking.serviceId}
          isInline
        />
        <NextLink href='/' className={styles.catalogLink}>
          Все места и услуги ›
        </NextLink>
      </div>
      {isTicketOpen && <TicketViewer booking={booking} onClose={() => setIsTicketOpen(false)} />}
    </div>
  )
}
