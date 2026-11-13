'use client'

import { Avatar } from '@awaisa/ui/Avatar'
import { CaretRight, Clock } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useNextSlot } from '@/entities/booking'
import { BusinessTile } from '@/entities/business'
import type { Booking } from '@/shared/api/types'
import styles from './AgainShelf.module.css'

interface AgainCardProps {
  booking: Booking
}

const visitDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

// One past visit as a card: the master's face with the place as a badge, when it was, and the
// master's own nearest free time — a tap anywhere books that time straight away.
export const AgainCard = ({ booking }: AgainCardProps) => {
  const slot = useNextSlot(booking.serviceId, { specialistId: booking.specialistId })
  const firstName = booking.specialistName.split(' ')[0]
  const href = `/${booking.business.slug}/book?${new URLSearchParams({
    service: booking.serviceId,
    specialist: booking.specialistId,
    ...(slot ? { date: slot.date, time: slot.time } : {}),
  })}`

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <span className={styles.face}>
          <Avatar name={booking.specialistName} size='lg' />
          <span className={styles.badge}>
            <BusinessTile name={booking.business.name} size='xs' />
          </span>
        </span>
        <span className={styles.text}>
          <h3 className={styles.service}>
            {/* The whole card books: this link stretches over it. */}
            <NextLink
              href={href}
              className={styles.link}
              aria-label={`Записаться снова: ${booking.serviceName}, ${firstName}${slot ? `, ${slot.dayLabel.toLowerCase()} с ${slot.time}` : ''}`}
            >
              {booking.serviceName}
            </NextLink>
          </h3>
          <span className={styles.meta}>
            {firstName} · {booking.business.name}
          </span>
        </span>
      </div>
      <p className={styles.footer}>
        <span>Были {visitDate.format(new Date(booking.startsAt))}</span>
        <span className={styles.next} data-free={slot ? '' : undefined}>
          {slot ? (
            <>
              <Clock weight='bold' aria-hidden />
              {slot.dayLabel} с {slot.time}
            </>
          ) : (
            'Записаться'
          )}
          <CaretRight weight='bold' aria-hidden className={styles.chevron} />
        </span>
      </p>
    </article>
  )
}
