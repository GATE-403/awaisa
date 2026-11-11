'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { CalendarCheck } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { formatDuration, formatPrice, useNextSlot } from '@/entities/booking'
import type { Business, Service } from '@/shared/api/types'
import styles from './Place.module.css'

interface NextSlotCardProps {
  business: Business
  service: Service
}

const getSlotText = (slot: ReturnType<typeof useNextSlot>) => {
  if (slot === undefined) return 'Ищем ближайшее окно…'
  if (slot === null) return 'Окна появятся скоро'

  return `${slot.dayLabel} в ${slot.time}`
}

// The quickest way in: the first free time for the most booked service, with any master.
export const NextSlotCard = ({ business, service }: NextSlotCardProps) => {
  const slot = useNextSlot(service.id)

  return (
    // One compact row: when, for what, and the way in on the right.
    <aside className={`${styles.card} ${styles.slotCard}`} aria-label='Ближайшее окно'>
      <span className={styles.slotGlyph} aria-hidden>
        <CalendarCheck weight='fill' />
      </span>
      <div className={styles.slotText}>
        <p className={styles.cardEyebrow}>Ближайшее окно</p>
        <p
          className={styles.slot}
          aria-live='polite'
          data-loading={slot === undefined || undefined}
        >
          {getSlotText(slot)}
        </p>
        <p className={styles.slotMeta}>
          {service.name} · {formatDuration(service.durationMinutes)} · {formatPrice(service.price)}
        </p>
      </div>
      <ButtonLink
        variant='outline'
        size='sm'
        className={styles.cardButton}
        render={
          <NextLink
            href={
              slot
                ? `/${business.slug}/book?service=${service.id}&specialist=any&date=${slot.date}&time=${slot.time}`
                : `/${business.slug}/book?service=${service.id}`
            }
          />
        }
      >
        Записаться
      </ButtonLink>
    </aside>
  )
}
