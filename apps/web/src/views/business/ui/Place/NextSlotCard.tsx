'use client'

import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { ArrowRight } from '@phosphor-icons/react/ssr'
import { type CSSProperties, useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useNextSlot } from '@/entities/booking'
import { pickTint } from '@/entities/business'
import { useBookingDraft } from '@/features/bookingDraft'
import type { Business, Service } from '@/shared/api/types'
import { isBookingPath } from '@/shared/config/navigation'
import type { Translate } from '@/shared/i18n'
import { Link as NextLink, usePathname } from '@/shared/i18n/navigation'
import { useFormat } from '@/shared/i18n/useFormat'
import { useTuckOnScroll } from '@/shared/lib/hooks/useTuckOnScroll'
import styles from './Place.module.css'

interface NextSlotCardProps {
  business: Business
  service: Service
}

const subscribeNoop = () => () => {}

const getSlotText = (t: Translate, slot: ReturnType<typeof useNextSlot>) => {
  if (slot === undefined) return t(msg`Looking for a free time…`)
  if (slot === null) return t(msg`Free times coming soon`)

  return `${t(slot.dayLabel)}, ${slot.time}`
}

// The quickest way in: the first free time for the most booked service, with any master.
export const NextSlotCard = ({ business, service }: NextSlotCardProps) => {
  const { t } = useLingui()
  const format = useFormat()
  const slot = useNextSlot(service.id)
  const draft = useBookingDraft()
  const isTucked = useTuckOnScroll()
  const pathname = usePathname()
  // One way to book on screen at a time: while the head's «Book» is in view the pill waits,
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

  // A booking already started here: «Continue booking» is the one pill, not this.
  // The booking sheet is open over this page: from 768px the pill never tucks away and would sit
  // on the sheet's own action bar.
  if (draft?.slug === business.slug || !isMounted || isBookingPath(pathname)) return null

  // Rendered into <body>: a fixed pill inside a section with `content-visibility` (which contains
  // paint) would be fixed to that section and slide under the next one.
  return createPortal(
    // One slim pill in the place's colour, the whole of it a link - the same shape and place as
    // «Continue booking», tucking away while the page scrolls down.
    <aside
      className={styles.slotCard}
      aria-label={t`Next free time`}
      data-tucked={isTucked || isHeadBookVisible || undefined}
      style={{ '--tint': pickTint(business.name) } as CSSProperties}
    >
      <NextLink href={href} className={styles.slotLink}>
        {/* Said before what the card shows, not instead of it: the name keeps the visible
            words (WCAG 2.5.3), so voice control finds «Today, 18:30». */}
        <span className={styles.srOnly}>{slot ? t`Book for ` : t`Book: `}</span>
        <span className={styles.slotText}>
          <span
            className={styles.slotWhen}
            aria-live='polite'
            data-loading={slot === undefined || undefined}
          >
            {getSlotText(t, slot)}
          </span>
          <span className={styles.slotMeta}>
            {service.name} · {format.duration(service.durationMinutes)} ·{' '}
            {format.price(service.price)}
          </span>
        </span>
        <span className={styles.slotArrow} aria-hidden>
          <ArrowRight />
        </span>
      </NextLink>
    </aside>,
    document.body,
  )
}
