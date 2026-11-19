'use client'

import { Menu, MenuItem, MenuSeparator } from '@awaisa/ui/Menu'
import { CaretRight, ChatCircle, DotsThree, Phone } from '@phosphor-icons/react/ssr'
import { formatDuration, formatPrice, PAYMENT_STATUS_TEXT } from '@/entities/booking'
import { addMinutes, PersonAvatar } from '@/entities/business'
import type { AdminBooking, OutcomeInput } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { WhatsappMark } from '@/shared/ui/BrandLogo/BrandLogo'
import { GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { VisitOutcomeSection } from '@/views/manage/ui/BookingDetailsDialog/VisitOutcomeSection'
import styles from './BookingInspector.module.css'

interface BookingInspectorProps {
  slug: string
  booking: AdminBooking
  /** Resolves true once cancelled (the toast then offers «Вернуть»). */
  onCancel: (id: string) => Promise<boolean>
  /** Set once the visit's day has come: staff can mark it. */
  onOutcome?: (id: string, input: OutcomeInput) => Promise<AdminBooking | null>
  onOpenClient: (phone: string) => void
  onClose: () => void
}

const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const capitalizeFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

// A visit as staff need it, like an event inspector in Calendar: who first (face, name, number,
// what they pay), then what and when in two quiet lines, the ways to reach them as one capsule of
// glyphs, and the visit's outcome. Cancelling sits in «⋯» — it happens at once and the toast
// brings it back.
export const BookingInspector = ({
  slug,
  booking,
  onCancel,
  onOutcome,
  onOpenClient,
  onClose,
}: BookingInspectorProps) => {
  const isCancelled = booking.status === 'cancelled'
  const digits = booking.customerPhone.replace(/\D/g, '')
  const total = booking.price - (booking.discount?.amount ?? 0)
  const day = capitalizeFirst(dayFormatter.format(new Date(`${booking.date}T12:00:00`)))
  const master = booking.specialistName.split(' ')[0]

  const handleCancel = async () => {
    if (await onCancel(booking.id)) onClose()
  }

  return (
    <div className={styles.inspector} data-cancelled={isCancelled || undefined}>
      <header className={styles.head}>
        <PersonAvatar name={booking.customerName} size='md' />
        <span className={styles.who}>
          <button
            type='button'
            className={styles.client}
            onClick={() => onOpenClient(booking.customerPhone)}
          >
            {booking.customerName}
            <CaretRight weight='bold' aria-hidden />
            <span className={styles.srOnly}>: карточка клиента</span>
          </button>
          <a className={styles.phone} href={`tel:${booking.customerPhone}`}>
            {formatPhone(booking.customerPhone)}
          </a>
        </span>
        <span className={styles.price}>
          {booking.discount && <s className={styles.oldPrice}>{formatPrice(booking.price)}</s>}
          {formatPrice(total)}
        </span>
      </header>

      <div className={styles.facts}>
        <p className={styles.what}>
          {booking.serviceName}
          <span className={styles.muted}> · {master}</span>
        </p>
        <p className={styles.when}>
          {day} · {booking.time}–{addMinutes(booking.time, booking.durationMinutes)} ·{' '}
          {formatDuration(booking.durationMinutes)}
        </p>
        {isCancelled && <p className={styles.cancelled}>Запись отменена</p>}
        {booking.discount && (
          <p className={styles.note}>
            {booking.discount.title} · −{formatPrice(booking.discount.amount)}
          </p>
        )}
        {booking.payment && (
          <p className={styles.note}>
            Предоплата {formatPrice(booking.payment.amount)} ·{' '}
            {PAYMENT_STATUS_TEXT[booking.payment.status]}
          </p>
        )}
        {booking.comment && <p className={styles.comment}>«{booking.comment}»</p>}
      </div>

      <div className={styles.actions}>
        <GlyphGroup label='Связаться с клиентом'>
          <a href={`tel:${booking.customerPhone}`} aria-label='Позвонить' title='Позвонить'>
            <Phone aria-hidden />
          </a>
          <a
            href={`https://wa.me/${digits}`}
            target='_blank'
            rel='noreferrer'
            aria-label='Написать в WhatsApp'
            title='WhatsApp'
          >
            <WhatsappMark />
          </a>
          <a href={`sms:${booking.customerPhone}`} aria-label='Написать SMS' title='SMS'>
            <ChatCircle aria-hidden />
          </a>
          <Menu label='Ещё действия' trigger={<DotsThree weight='bold' aria-hidden />}>
            <MenuItem onClick={() => onOpenClient(booking.customerPhone)}>
              Карточка клиента
            </MenuItem>
            {!isCancelled && (
              <>
                <MenuSeparator />
                <MenuItem variant='danger' onClick={() => void handleCancel()}>
                  Отменить запись
                </MenuItem>
              </>
            )}
          </Menu>
        </GlyphGroup>
      </div>

      {!isCancelled && onOutcome && (
        <VisitOutcomeSection
          slug={slug}
          booking={booking}
          onChange={(input) => onOutcome(booking.id, input)}
        />
      )}
    </div>
  )
}
