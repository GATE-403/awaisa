'use client'

import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { Business, Service } from '@/common/api/types'
import { useNextSlot } from '@/common/hooks/useNextSlot'
import styles from './StoreHero.module.css'

interface NextSlotAsideProps {
  business: Business
  service: Service
}

const getSlotText = (slot: ReturnType<typeof useNextSlot>) => {
  if (slot === undefined) return 'Ищем ближайшее окно…'
  if (slot === null) return 'Свободные окна появятся скоро'

  return `${slot.dayLabel} в ${slot.time}`
}

export const NextSlotAside = ({ business, service }: NextSlotAsideProps) => {
  const slot = useNextSlot(service.id)

  return (
    <aside className={styles.aside} aria-label='Ближайшее окно'>
      <p className={styles.asideLabel}>Ближайшее свободное окно</p>
      <p
        className={styles.asideSlot}
        aria-live='polite'
        data-loading={slot === undefined || undefined}
      >
        {getSlotText(slot)}
      </p>
      <p className={styles.asideMeta}>{service.name} · любой мастер</p>
      <div className={styles.asideLinks}>
        <NextLink
          href={`/${business.slug}/book?service=${service.id}`}
          className={styles.asideLink}
        >
          Записаться
          <CaretRight weight='bold' aria-hidden />
        </NextLink>
        {business.phone && (
          <a href={`tel:${business.phone}`} className={styles.asideLink}>
            Позвонить
            <CaretRight weight='bold' aria-hidden />
          </a>
        )}
      </div>
    </aside>
  )
}
