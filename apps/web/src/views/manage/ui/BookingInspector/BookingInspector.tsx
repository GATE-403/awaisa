'use client'

import { Button } from '@awaisa/ui/Button'
import { Menu, MenuItem, MenuSeparator } from '@awaisa/ui/Menu'
import {
  ArrowCounterClockwise,
  CaretRight,
  ChatCircle,
  DotsThree,
  Phone,
  Prohibit,
  WhatsappLogo,
} from '@phosphor-icons/react/ssr'
import { formatDuration, formatPrice, PAYMENT_STATUS_TEXT } from '@/entities/booking'
import { addMinutes, PersonAvatar } from '@/entities/business'
import type { AdminBooking, OutcomeInput } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
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
  /** A cancelled visit on a day still ahead: book the same client, service and master again. */
  onBookAgain?: (booking: AdminBooking) => void
  /** «Добавить товар» in «Итог визита». */
  onSellProducts?: (booking: AdminBooking) => void
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
  onBookAgain,
  onSellProducts,
  onClose,
}: BookingInspectorProps) => {
  const isTouch = useMediaQuery('(pointer: coarse)')
  const isCancelled = booking.status === 'cancelled'
  const canBookAgain = isCancelled && onBookAgain !== undefined
  const digits = booking.customerPhone.replace(/\D/g, '')
  const total = booking.price - (booking.discount?.amount ?? 0)
  const day = capitalizeFirst(dayFormatter.format(new Date(`${booking.date}T12:00:00`)))
  const master = booking.specialistName.split(' ')[0]

  const handleCancel = async () => {
    if (await onCancel(booking.id)) onClose()
  }

  const handleCopyPhone = () => {
    void navigator.clipboard?.writeText(booking.customerPhone)
  }

  return (
    <div className={styles.inspector} data-cancelled={isCancelled || undefined}>
      {/* Cancelled: said once, at the top, like a cancelled event in Calendar — the glyph of its
          card in red, the words quiet; the rest stays readable (no strike-through), only the
          price is struck, the one thing that will not come. */}
      {isCancelled && (
        <p className={styles.status}>
          <Prohibit weight='bold' aria-hidden />
          Запись отменена
        </p>
      )}
      {/* Who and what in two lines beside the face; the price on the right. */}
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
          <span className={styles.what}>
            {booking.serviceName} · {master}
          </span>
        </span>
        <span className={styles.price}>
          {booking.discount && !isCancelled && (
            <s className={styles.oldPrice}>{formatPrice(booking.price)}</s>
          )}
          {isCancelled ? (
            <s className={styles.lostPrice}>{formatPrice(total)}</s>
          ) : (
            formatPrice(total)
          )}
        </span>
      </header>

      <p className={styles.when}>
        {day}, {booking.time}–{addMinutes(booking.time, booking.durationMinutes)} ·{' '}
        {formatDuration(booking.durationMinutes)}
        {booking.discount && ` · ${booking.discount.title}`}
        {booking.payment &&
          ` · предоплата ${formatPrice(booking.payment.amount)}, ${PAYMENT_STATUS_TEXT[booking.payment.status].toLowerCase()}`}
      </p>
      {booking.comment && <p className={styles.comment}>«{booking.comment}»</p>}

      <div className={styles.actions} data-book-again={canBookAgain || undefined}>
        {/* A capsule of thin glyphs with a mouse; on phones four labelled tiles, like the
            actions under a contact in iOS. The labels name the buttons either way. */}
        {/* Phones: calling is the one main action, a wide accent capsule. */}
        {/* A cancelled visit's one action is to book it again, in the same row as the ways to
            reach the client (on phones it takes the wide capsule; the call joins the glyphs). */}
        {canBookAgain ? (
          <Button
            variant={isTouch ? 'primary' : 'secondary'}
            className={styles.bookAgain}
            onClick={() => onBookAgain(booking)}
          >
            <ArrowCounterClockwise aria-hidden />
            Записать снова
          </Button>
        ) : (
          <a className={styles.callPrimary} href={`tel:${booking.customerPhone}`}>
            <Phone weight='bold' aria-hidden />
            Позвонить
          </a>
        )}
        <GlyphGroup label='Связаться с клиентом'>
          <a
            className={styles.callGlyph}
            href={`tel:${booking.customerPhone}`}
            title={formatPhone(booking.customerPhone)}
          >
            <Phone aria-hidden />
            <span className={styles.actionLabel}>Позвонить</span>
          </a>
          <a href={`https://wa.me/${digits}`} target='_blank' rel='noreferrer' title='WhatsApp'>
            <WhatsappLogo aria-hidden />
            <span className={styles.actionLabel}>WhatsApp</span>
          </a>
          <a href={`sms:${booking.customerPhone}`} title='SMS'>
            <ChatCircle aria-hidden />
            <span className={styles.actionLabel}>SMS</span>
          </a>
          <Menu
            label='Ещё действия'
            trigger={
              <>
                <DotsThree weight='bold' aria-hidden />
                <span className={styles.actionLabel}>Ещё</span>
              </>
            }
          >
            <MenuItem onClick={() => onOpenClient(booking.customerPhone)}>
              Карточка клиента
            </MenuItem>
            <MenuItem onClick={handleCopyPhone}>
              Скопировать {formatPhone(booking.customerPhone)}
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
          onSellProducts={onSellProducts ? () => onSellProducts(booking) : undefined}
          isCompact
          controlSize={isTouch ? 'md' : 'sm'}
        />
      )}
    </div>
  )
}
