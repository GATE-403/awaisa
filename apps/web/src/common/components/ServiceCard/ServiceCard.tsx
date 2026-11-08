import { Clock } from 'lucide-react'
import NextLink from 'next/link'
import type { Service } from '@/common/api/types'
import { formatDuration, formatPrice } from '@/features/booking/bookingUtils'
import styles from './ServiceCard.module.css'

interface ServiceCardProps {
  service: Service
}

export const ServiceCard = ({ service }: ServiceCardProps) => (
  <NextLink href={`/book?service=${service.id}`} className={styles.card}>
    <span className={styles.name}>{service.name}</span>
    <span className={styles.description}>{service.description}</span>
    <span className={styles.meta}>
      <span className={styles.duration}>
        <Clock className={styles.icon} aria-hidden />
        {formatDuration(service.durationMinutes)}
      </span>
      <span className={styles.price}>{formatPrice(service.price)}</span>
    </span>
  </NextLink>
)
