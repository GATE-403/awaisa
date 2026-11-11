'use client'

import { useToast } from '@awaisa/ui/Toast'
import { MapPin, Phone } from '@phosphor-icons/react/ssr'
import { useRef, useState } from 'react'
import { formatDayLong, formatDuration, formatPrice, Ticket } from '@/entities/booking'
import { addMinutes } from '@/entities/business'
import type { Booking } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { haptic } from '@/shared/lib/nativeBridge'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './TicketViewer.module.css'

interface TicketViewerProps {
  booking: Booking
  onClose: () => void
}

const toFileName = (booking: Booking) =>
  `talon-${booking.business.slug}-${booking.date}-${booking.time.replace(':', '')}.png`

// Like showing a ticket at the door: only the ticket, large and bright, and a way to keep it.
const getBookingCode = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase()

export const TicketViewer = ({ booking, onClose }: TicketViewerProps) => {
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

      // Phones save images through the share sheet; desktops get a regular download.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Талон: ${booking.serviceName}` })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
        link.click()
        URL.revokeObjectURL(url)
      }
      haptic('success')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.show({ title: 'Не получилось сохранить талон', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      title='Талон'
      cancelLabel='Закрыть'
      onClose={onClose}
      action={{
        label: isSaving ? 'Сохраняем…' : 'Скачать',
        onClick: download,
        disabled: isSaving,
      }}
    >
      <div className={styles.stage}>
        <div ref={ticketRef} className={styles.ticket}>
          <Ticket booking={booking} />
        </div>
        <p className={styles.hint}>Покажите на ресепшене. «Скачать» сохранит картинкой.</p>
      </div>

      {/* Everything about the visit, not just what fits on the ticket. */}
      <section className={sheet.group} aria-label='О визите'>
        <h3 className={sheet.groupTitle}>О визите</h3>
        <dl className={`${sheet.list} ${styles.details}`}>
          <div className={styles.detail}>
            <dt>Когда</dt>
            <dd>
              {formatDayLong(booking.date)}, {booking.time}–
              {addMinutes(booking.time, booking.durationMinutes)}
            </dd>
          </div>
          <div className={styles.detail}>
            <dt>Услуга</dt>
            <dd>
              {booking.serviceName} · {formatDuration(booking.durationMinutes)}
            </dd>
          </div>
          <div className={styles.detail}>
            <dt>Мастер</dt>
            <dd>{booking.specialistName}</dd>
          </div>
          <div className={styles.detail}>
            <dt>Стоимость</dt>
            <dd>
              {formatPrice(booking.price)}
              <span className={styles.note}>оплата в салоне — наличными или картой</span>
            </dd>
          </div>
          <div className={styles.detail}>
            <dt>Номер</dt>
            <dd className={styles.code}>{code}</dd>
          </div>
          <div className={styles.detail}>
            <dt>Статус</dt>
            <dd>{booking.status === 'cancelled' ? 'Отменена' : 'Подтверждена'}</dd>
          </div>
        </dl>
      </section>

      <section className={sheet.group} aria-label='Где'>
        <h3 className={sheet.groupTitle}>{booking.business.name}</h3>
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
              <span className={styles.rowAction}>Маршрут</span>
            </a>
          )}
          {booking.business.phone && (
            <a className={sheet.row} href={`tel:${booking.business.phone}`}>
              <span className={styles.rowLabel}>
                <Phone weight='regular' aria-hidden />
                {formatPhone(booking.business.phone)}
              </span>
              <span className={styles.rowAction}>Позвонить</span>
            </a>
          )}
        </div>
      </section>
    </Sheet>
  )
}
