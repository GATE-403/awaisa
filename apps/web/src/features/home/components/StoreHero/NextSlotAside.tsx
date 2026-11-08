'use client'

import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useNextSlot } from '@/common/hooks/useNextSlot'
import { COMPANY } from '@/constants/company'
import styles from './StoreHero.module.css'

interface NextSlotAsideProps {
  serviceId: string
  serviceName: string
}

const getSlotText = (slot: ReturnType<typeof useNextSlot>) => {
  if (slot === undefined) return 'Ищем ближайшее окно…'
  if (slot === null) return 'Свободные окна появятся скоро'

  return `${slot.dayLabel} в ${slot.time}`
}

export const NextSlotAside = ({ serviceId, serviceName }: NextSlotAsideProps) => {
  const slot = useNextSlot(serviceId)

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
      <p className={styles.asideMeta}>{serviceName} · любой мастер</p>
      <div className={styles.asideLinks}>
        <NextLink href={`/book?service=${serviceId}`} className={styles.asideLink}>
          Записаться
          <CaretRight weight='bold' aria-hidden />
        </NextLink>
        <a href={COMPANY.phoneHref} className={styles.asideLink}>
          Позвонить
          <CaretRight weight='bold' aria-hidden />
        </a>
      </div>
    </aside>
  )
}
