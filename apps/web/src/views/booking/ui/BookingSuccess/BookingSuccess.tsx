'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { CalendarPlus, Check, MapPin, Ticket as TicketIcon } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { downloadCalendarFile, Ticket } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { ForYouShelf } from '@/features/forYou'
import { TelegramReminderLink } from '@/features/telegramReminders'
import { TicketViewer } from '@/features/ticketView'
import type { Booking } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { getNativeApp, haptic } from '@/shared/lib/nativeBridge'
import styles from './BookingSuccess.module.css'

// The rings after the drop, each one fainter.
const RINGS = [0, 1]
// The water is drawn small and scaled up: sheet-sized layers (four of ~1800px) ran a phone's
// WebView out of tile memory and the whole sheet blinked dark for a frame.
const RIPPLE_SIZE = 240
// Long enough for the last ring to reach the edge; then the layers leave the page.
const RIPPLE_MS = 2400

interface BookingSuccessProps {
  booking: Booking
}

export const BookingSuccess = ({ booking }: BookingSuccessProps) => {
  const toast = useToast()
  const t = useT()
  const session = useSession()
  const [isTicketOpen, setIsTicketOpen] = useState(false)
  const pondRef = useRef<HTMLDivElement>(null)
  const checkRef = useRef<HTMLSpanElement>(null)
  const hasTapped = useRef(false)
  const [isRippling, setIsRippling] = useState(true)

  // The water spreads from the check to the farthest corner of the sheet.
  useLayoutEffect(() => {
    const pond = pondRef.current
    const check = checkRef.current
    if (!pond || !check) return
    const area = pond.getBoundingClientRect()
    const drop = check.getBoundingClientRect()
    const x = drop.left + drop.width / 2 - area.left
    const y = drop.top + drop.height / 2 - area.top
    const reach = Math.hypot(Math.max(x, area.width - x), Math.max(y, area.height - y))
    pond.style.setProperty('--drop-x', `${x}px`)
    pond.style.setProperty('--drop-y', `${y}px`)
    pond.style.setProperty('--grow', `${(reach * 2) / RIPPLE_SIZE}`)
  }, [])

  // The drop is felt once, as the check lands: one firm tap (Taptic in the app, a short buzz in
  // browsers that can vibrate). The ref keeps React's dev double-run from tapping twice.
  useEffect(() => {
    const timer = window.setTimeout(() => setIsRippling(false), RIPPLE_MS)
    const isCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!hasTapped.current && !isCalm) {
      if (getNativeApp()) haptic('impact')
      else navigator.vibrate?.(30)
    }
    hasTapped.current = true
    return () => window.clearTimeout(timer)
  }, [])

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
      {isRippling && (
        <div ref={pondRef} className={styles.pond} aria-hidden>
          <span className={styles.ripple} data-kind='swell' />
          {RINGS.map((n) => (
            <span
              key={n}
              className={styles.ripple}
              data-kind='ring'
              style={{ '--n': n } as CSSProperties}
            />
          ))}
        </div>
      )}
      <span ref={checkRef} className={styles.check} aria-hidden>
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
        {booking.payment?.status === 'paid'
          ? t('Остаток оплатите в салоне.')
          : t('Оплата в салоне.')}{' '}
        {t('Перенести или отменить можно по ссылке из SMS.')}
      </p>
      <TelegramReminderLink bookingId={booking.id} />
      {/* The ticket itself opens the full one: details, place, download. */}
      <button
        type='button'
        className={styles.ticket}
        onClick={() => setIsTicketOpen(true)}
        aria-label={t('Показать талон')}
      >
        <Ticket booking={booking} />
      </button>
      {/* Next steps as three equal tiles, icon over word, like a share sheet's row. */}
      <div className={styles.tiles}>
        <button type='button' className={styles.tile} onClick={handleAddToCalendar}>
          <CalendarPlus weight='bold' aria-hidden />
          {t('В календарь')}
        </button>
        {booking.business.mapUrl ? (
          <a
            href={booking.business.mapUrl}
            target='_blank'
            rel='noreferrer'
            className={styles.tile}
          >
            <MapPin weight='bold' aria-hidden />
            {t('Маршрут')}
          </a>
        ) : null}
        <button type='button' className={styles.tile} onClick={() => setIsTicketOpen(true)}>
          <TicketIcon weight='bold' aria-hidden />
          {t('Талон')}
        </button>
      </div>
      <div className={styles.primary}>
        <ButtonLink render={<NextLink href='/bookings' />} size='lg' fullWidth>
          {t('Мои записи')}
        </ButtonLink>
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
