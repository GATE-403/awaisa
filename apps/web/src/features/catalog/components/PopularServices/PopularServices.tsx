import NextLink from 'next/link'
import type { BusinessKind, PopularService } from '@/common/api/types'
import { StoreShelf } from '@/common/components/StoreShelf/StoreShelf'
import { pluralize } from '@/common/utils/plural'
import { formatDuration, formatPrice } from '@/features/booking/bookingUtils'
import styles from './PopularServices.module.css'

interface PopularServicesProps {
  kind: BusinessKind | undefined
  services: PopularService[]
}

// What people come for, across places: tap a service to see who does it and for how much.
export const PopularServices = ({ kind, services }: PopularServicesProps) => {
  if (services.length === 0) return null

  return (
    <StoreShelf
      title='Популярные услуги.'
      subtitle='Сравните цены в разных местах.'
      label='Популярные услуги'
      size='sm'
    >
      {services.map((service) => (
        <li key={service.name}>
          <NextLink
            href={`/?${new URLSearchParams({ q: service.name, ...(kind ? { kind } : {}) })}`}
            className={styles.card}
          >
            <span className={styles.name}>{service.name}</span>
            <span className={styles.meta}>{formatDuration(service.durationMinutes)}</span>
            <span className={styles.footer}>
              <span className={styles.price}>от {formatPrice(service.minPrice)}</span>
              <span className={styles.places}>
                {pluralize(service.places, ['место', 'места', 'мест'])}
              </span>
            </span>
          </NextLink>
        </li>
      ))}
    </StoreShelf>
  )
}
