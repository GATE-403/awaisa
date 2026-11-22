'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { CalendarPlus, Check, MapPin } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { downloadCalendarFile, formatPrice, Ticket } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { FollowButton } from '@/features/followMaster'
import { ForYouShelf } from '@/features/forYou'
import { TelegramReminderLink } from '@/features/telegramReminders'
import { TicketViewer } from '@/features/ticketView'
import type { Booking } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { getNativeApp, haptic } from '@/shared/lib/nativeBridge'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import styles from './BookingSuccess.module.css'

interface BookingSuccessProps {
  booking: Booking
  /** Another visit at the same place, the same day after this one (often to another master). */
  onBookAnother?: () => void
}

// When the visit ends: «Ещё запись» offers the times after it.
const endOf = (booking: Booking) => {
  const [hours = 0, minutes = 0] = booking.time.split(':').map(Number)
  const end = hours * 60 + minutes + booking.durationMinutes
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
}

export const BookingSuccess = ({ booking, onBookAnother }: BookingSuccessProps) => {
  const toast = useToast()
  const t = useT()
  const session = useSession()
  const [isTicketOpen, setIsTicketOpen] = useState(false)
  const hasTapped = useRef(false)

  // Booked is felt once: one firm tap (Taptic in the app, a short buzz in browsers that can
  // vibrate). No light or motion on screen: they cost frames on phones. The ref keeps React's dev
  // double-run from tapping twice.
  useEffect(() => {
    const isCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!hasTapped.current && !isCalm) {
      if (getNativeApp()) haptic('impact')
      else navigator.vibrate?.(30)
    }
    hasTapped.current = true
  }, [])

  const price = booking.price - (booking.discount?.amount ?? 0)
  const isDepositPaid = booking.payment?.status === 'paid'
  const toPay = isDepositPaid ? Math.max(0, price - (booking.payment?.amount ?? 0)) : price

  const handleAddToCalendar = () => {
    downloadCalendarFile(booking, booking.business)
    toast.show({
      title: t('Событие для календаря готово'),
      description: t('Откройте файл, чтобы добавить'),
    })
  }

  return (
    <div className={styles.success}>
      {/* A confirmation like Apple Pay's: a green check, the words, then the one fact that
          matters — when. */}
      <span className={styles.check} aria-hidden>
        <Check weight='bold' />
      </span>
      <h1 className={styles.title}>{t('Вы записаны')}</h1>
      <p className={styles.lead}>
        {t('{day} в {time} · {place}', {
          day: t.dayLong(booking.date),
          time: booking.time,
          place: booking.business.name,
        })}
      </p>
      {/* What to do now, in plain words: someone new to this does not read a barcode. */}
      <p className={styles.nextStep}>
        {t('Приходите к {time}', { time: booking.time })}
        {booking.business.address
          ? t(' по адресу {address}', { address: booking.business.address })
          : ''}
        .{' '}
        {/* The sum itself, in bold: «Оплата в салоне» alone sent people looking in the ticket. */}
        {isDepositPaid ? t('Остаток в салоне —') : t('Оплата в салоне —')}{' '}
        <b className={styles.amount}>{formatPrice(toPay)}</b>.{' '}
        {t('Перенести или отменить можно по ссылке из SMS.')}
      </p>
      <TelegramReminderLink bookingId={booking.id} />
      {/* The ticket itself opens the full one: details, place, download. Its own stretched
          «Показать талон» button, not a button around the whole ticket — an article inside a
          button read as one long label that did not match what is written (WCAG 2.5.3). */}
      <div className={styles.ticket}>
        <Ticket booking={booking} onOpen={() => setIsTicketOpen(true)} />
      </div>
      {/* A service another master does is a booking of its own: one quiet row starts it here, at
          the same place and day after this visit, the name and number kept. */}
      {onBookAnother && (
        <button type='button' className={styles.another} onClick={onBookAnother}>
          {t('Ещё запись в {place} · после {time} ›', {
            place: booking.business.name,
            time: endOf(booking),
          })}
        </button>
      )}
      {/* One line of actions: the one primary «Мои записи» and the rest as thin glyphs in one
          capsule of the same height (calendar, route, following the master). Tiles, a link, a big
          button and a small capsule of four sizes read as clutter. The ticket opens itself. */}
      <div className={styles.actions}>
        <ButtonLink
          render={<NextLink href='/bookings' />}
          size='md'
          className={styles.primaryAction}
        >
          {t('Мои записи')}
        </ButtonLink>
        <GlyphGroup label={t('Ещё')}>
          <GlyphButton
            icon={<CalendarPlus />}
            label={t('В календарь')}
            onClick={handleAddToCalendar}
          />
          {booking.business.mapUrl && (
            <a
              href={booking.business.mapUrl}
              target='_blank'
              rel='noreferrer'
              aria-label={t('Маршрут')}
              title={t('Маршрут')}
            >
              <MapPin aria-hidden />
            </a>
          )}
          {/* Clients stay with their master: following brings word when the master has time. */}
          <FollowButton
            variant='groupItem'
            specialistId={booking.specialistId}
            name={booking.specialistName.split(' ')[0] ?? booking.specialistName}
          />
        </GlyphGroup>
      </div>
      {/* Guests keep bookings on this device only: say so at the moment it matters. */}
      {session.status === 'guest' && (
        <p className={styles.keep}>
          {t('Запись сохранена на этом телефоне.')}{' '}
          <NextLink href='/login?next=/bookings' className={styles.keepLink}>
            {t('Войдите по номеру')}
          </NextLink>
          {t(', чтобы видеть записи на любом устройстве.')}
        </p>
      )}
      {/* What to look at next, chosen from this visit and the client's answers — a reason to
          keep browsing rather than a push back to the catalog. */}
      <div className={styles.next}>
        <ForYouShelf
          surface='success'
          title={t('Вам может понравиться')}
          seedVisit={`${booking.serviceId}~${booking.startsAt.slice(0, 10)}`}
          likeServiceId={booking.serviceId}
          excludeServiceId={booking.serviceId}
          isInline
        />
        <NextLink href='/' className={styles.catalogLink}>
          {t('Все места и услуги ›')}
        </NextLink>
      </div>
      {isTicketOpen && <TicketViewer booking={booking} onClose={() => setIsTicketOpen(false)} />}
    </div>
  )
}
