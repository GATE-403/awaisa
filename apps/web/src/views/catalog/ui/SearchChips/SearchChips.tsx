import { Trans, useLingui } from '@lingui/react/macro'
import type { BusinessKind, PopularService } from '@/shared/api/types'
import { Link as NextLink } from '@/shared/i18n/navigation'
import chip from '@/shared/ui/Chip/Chip.module.css'
import styles from './SearchChips.module.css'

interface SearchChipsProps {
  kind: BusinessKind | undefined
  services: PopularService[]
}

// «Popular searches»: one-tap searches built from what places actually offer.
export const SearchChips = ({ kind, services }: SearchChipsProps) => {
  const { t } = useLingui()
  if (services.length === 0) return null

  return (
    <nav className={styles.row} aria-label={t`Popular searches`}>
      <span className={styles.label}>
        <Trans>Popular searches</Trans>
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
