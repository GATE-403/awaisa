import NextLink from 'next/link'
import type { BusinessKind, PopularService } from '@/shared/api/types'
import { T } from '@/shared/i18n'
import chip from '@/shared/ui/Chip/Chip.module.css'
import styles from './SearchChips.module.css'

interface SearchChipsProps {
  kind: BusinessKind | undefined
  services: PopularService[]
}

// «Часто ищут»: one-tap searches built from what places actually offer.
export const SearchChips = ({ kind, services }: SearchChipsProps) => {
  if (services.length === 0) return null

  return (
    <nav className={styles.row} aria-label='Popular searches'>
      <span className={styles.label}>
        <T>Popular searches</T>
      </span>
      {services.map((service) => (
        <NextLink
          key={service.name}
          href={`/?${new URLSearchParams({ q: service.name, ...(kind ? { kind } : {}) })}`}
          className={`${chip.chip} ${styles.chip}`}
        >
          {service.name}
          <span className={styles.count}>{service.places}</span>
        </NextLink>
      ))}
    </nav>
  )
}
