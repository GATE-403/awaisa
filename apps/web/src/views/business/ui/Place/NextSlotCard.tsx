'use client'

import { ArrowRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type CSSProperties, useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { formatDuration, formatPrice, useNextSlot } from '@/entities/booking'
import { pickTint } from '@/entities/business'
import { useBookingDraft } from '@/features/bookingDraft'
import type { Business, Service } from '@/shared/api/types'
import { useTuckOnScroll } from '@/shared/lib/hooks/useTuckOnScroll'
import styles from './Place.module.css'

interface NextSlotCardProps {
  business: Business
  service: Service
}

const subscribeNoop = () => () => {}

const getSlotText = (slot: ReturnType<typeof useNextSlot>) => {
  if (slot === undefined) return 'Ищем ближайшее окно…'
  if (slot === null) return 'Окна появятся скоро'

  return `${slot.dayLabel} в ${slot.time}`
}

// The quickest way in: the first free time for the most booked service, with any master.
export const NextSlotCard = ({ business, service }: NextSlotCardProps) => {
  const slot = useNextSlot(service.id)
  const draft = useBookingDraft()
  const isTucked = useTuckOnScroll()
  // One way to book on screen at a time: while the head's «Записаться» is in view the pill waits,
  // so it does not cover the menu right under the head when the page opens.
  const [isHeadBookVisible, setIsHeadBookVisible] = useState(true)
  const isMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )
  useEffect(() => {
    const button = document.querySelector('[data-place-book]')
    if (!button) {
      setIsHeadBookVisible(false)
      return
    }
    const observer = new IntersectionObserver(([entry]) =>
      setIsHeadBookVisible(Boolean(entry?.isIntersecting)),
    )
    observer.observe(button)
    return () => observer.disconnect()
  }, [])

  const href = slot
    ? `/${business.slug}/book?service=${service.id}&specialist=any&date=${slot.date}&time=${slot.time}`
    : `/${business.slug}/book?service=${service.id}`

  // A booking already started here: «Продолжить запись» is the one pill, not this.
  if (draft?.slug === business.slug || !isMounted) return null

  // Rendered into <body>: a fixed pill inside a section with `content-visibility` (which contains
  // paint) would be fixed to that section and slide under the next one.
  return createPortal(
    // One slim pill in the place's colour, the whole of it a link — the same shape and place as
    // «Продолжить запись», tucking away while the page scrolls down.
    <aside
      className={styles.slotCard}
      aria-label='Ближайшее окно'
      data-tucked={isTucked || isHeadBookVisible || undefined}
      style={{ '--tint': pickTint(business.name) } as CSSProperties}
    >
      <NextLink href={href} className={styles.slotLink}>
        {/* Said before what the card shows, not instead of it: the name keeps the visible
            words (WCAG 2.5.3), so voice control finds «Сегодня, 18:30». */}
        <span className={styles.srOnly}>{slot ? 'Записаться на ' : 'Записаться: '}</span>
        <span className={styles.slotText}>
          <span
            className={styles.slotWhen}
            aria-live='polite'
            data-loading={slot === undefined || undefined}
          >
            {slot ? `${slot.dayLabel}, ${slot.time}` : getSlotText(slot)}
          </span>
          <span className={styles.slotMeta}>
            {service.name} · {formatDuration(service.durationMinutes)} ·{' '}
            {formatPrice(service.price)}
          </span>
        </span>
        <span className={styles.slotArrow} aria-hidden>
          <ArrowRight weight='bold' />
        </span>
      </NextLink>
    </aside>,
    document.body,
  )
}
