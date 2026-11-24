'use client'

import { useToast } from '@awaisa/ui/Toast'
import { MapPin, Phone } from '@phosphor-icons/react/ssr'
import { type ReactNode, useRef, useState } from 'react'
import { formatPrice, PAYMENT_STATUS_TEXT, Ticket } from '@/entities/booking'
import { addMinutes } from '@/entities/business'
import type { Booking } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import { haptic } from '@/shared/lib/nativeBridge'
import { saveFile } from '@/shared/lib/share'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './TicketViewer.module.css'

interface TicketViewerProps {
  booking: Booking
  onClose: () => void
  /** Slot under the ticket, e.g. «Add to Wallet» (features don't import features). */
  extra?: ReactNode
}

const toFileName = (booking: Booking) =>
  `talon-${booking.business.slug}-${booking.date}-${booking.time.replace(':', '')}.png`

// Like showing a ticket at the door: only the ticket, large and bright, and a way to keep it.
const getBookingCode = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase()

export const TicketViewer = ({ booking, onClose, extra }: TicketViewerProps) => {
  const t = useT()
  const code = getBookingCode(booking.id)
  const toast = useToast()
  const ticketRef = useRef<HTMLDivElement>(null)
  const [isSaving, setIsSaving] = useState(false)

  const download = async () => {
    const node = ticketRef.current
    if (!node) return
    setIsSaving(true)
    try {
      const { toBlob } = await import('html-to-image')
      const background = getComputedStyle(document.documentElement).getPropertyValue(
        '--color-sheet',
      )
      const blob = await toBlob(node, { pixelRatio: 3, backgroundColor: background.trim() })
      if (!blob) throw new Error('empty image')
      const file = new File([blob], toFileName(booking), { type: 'image/png' })

      const result = await saveFile(file, t('Ticket: {service}', { service: booking.serviceName }))
      if (result === 'cancelled') return
      haptic('success')
    } catch {
      toast.show({ title: t('Could not save the ticket'), type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      title={t('Ticket')}
      cancelLabel={t('Close')}
      onClose={onClose}
      action={{
        label: isSaving ? t('Saving…') : t('Download'),
        onClick: download,
        disabled: isSaving,
      }}
    >
      <div className={styles.stage}>
        <div ref={ticketRef} className={styles.ticket}>
          <Ticket booking={booking} />
        </div>
        <p className={styles.hint}>{t('Show it at the desk. “Download” saves it as a picture.')}</p>
        {extra}
      </div>

      {/* Everything about the visit, not just what fits on the ticket. */}
      <section className={sheet.group} aria-label={t('About the visit')}>
        <SectionCaption>{t('About the visit')}</SectionCaption>
        <dl className={`${sheet.list} ${styles.details}`}>
          <div className={styles.detail}>
            <dt>{t('When')}</dt>
            <dd>
              {t.dayLong(booking.date)}, {booking.time}–
              {addMinutes(booking.time, booking.durationMinutes)}
            </dd>
          </div>
          <div className={styles.detail}>
            <dt>{t('Service')}</dt>
            <dd>
              {booking.serviceName} · {t.duration(booking.durationMinutes)}
            </dd>
          </div>
          <div className={styles.detail}>
            <dt>{t('Specialist')}</dt>
            <dd>{booking.specialistName}</dd>
          </div>
          <div className={styles.detail}>
            <dt>{t('Price')}</dt>
            <dd>
              {formatPrice(booking.price - (booking.discount?.amount ?? 0))}
              {booking.discount && (
                <span className={styles.note}>
                  {t('with the “{title}” discount −{amount}', {
                    title: booking.discount.title,
                    amount: formatPrice(booking.discount.amount),
                  })}
                </span>
              )}
              <span className={styles.note}>
                {booking.isBySubscription
                  ? t('with a pass: the visit is taken off when the specialist marks it')
                  : booking.payment
                    ? `${t('Deposit {amount} {status}', {
                        amount: formatPrice(booking.payment.amount),
                        status: t(PAYMENT_STATUS_TEXT[booking.payment.status]),
                      })}${booking.payment.status === 'paid' ? t(', the rest at the salon') : ''}`
                    : t('pay at the salon: cash or card')}
              </span>
            </dd>
          </div>
          <div className={styles.detail}>
            <dt>{t('Number')}</dt>
            <dd className={styles.code}>{code}</dd>
          </div>
          <div className={styles.detail}>
            <dt>{t('Status')}</dt>
            <dd>{booking.status === 'cancelled' ? t('Cancelled') : t('Confirmed')}</dd>
          </div>
        </dl>
      </section>

      <section className={sheet.group} aria-label={t('Where')}>
        <SectionCaption>{booking.business.name}</SectionCaption>
        <div className={sheet.list}>
          {booking.business.address && (
            <a
              className={sheet.row}
              href={
                booking.business.mapUrl ||
                `https://2gis.kg/bishkek/search/${encodeURIComponent(booking.business.address)}`
              }
              target='_blank'
              rel='noreferrer'
            >
              <span className={styles.rowLabel}>
                <MapPin weight='regular' aria-hidden />
                {booking.business.address}
              </span>
              <span className={styles.rowAction}>{t('Directions')}</span>
            </a>
          )}
          {booking.business.phone && (
            <a className={sheet.row} href={`tel:${booking.business.phone}`}>
              <span className={styles.rowLabel}>
                <Phone weight='regular' aria-hidden />
                {formatPhone(booking.business.phone)}
              </span>
              <span className={styles.rowAction}>{t('Call')}</span>
            </a>
          )}
        </div>
      </section>
    </Sheet>
  )
}
