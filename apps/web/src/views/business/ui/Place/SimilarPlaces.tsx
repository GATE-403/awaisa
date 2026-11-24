'use client'

import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { BusinessCard, NextFreeProvider } from '@/entities/business'
import type { Business, BusinessCard as BusinessCardData } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import { Link as NextLink } from '@/shared/i18n/navigation'
import styles from './Place.module.css'

interface SimilarPlacesProps {
  business: Business
  places: BusinessCardData[]
}

const SHOWN = 10

// «Similar places» at the foot of a place: others of the same kind, as the catalog shows them -
// somewhere to go next when this one is full or far.
export const SimilarPlaces = ({ business, places }: SimilarPlacesProps) => {
  const { t } = useLingui()
  const kind = business.kind === 'other' ? null : t(getKindLabel(business.kind))
  const others = places.filter((place) => place.slug !== business.slug).slice(0, SHOWN)
  if (others.length === 0) return null

  return (
    <section className={styles.similar} aria-labelledby='place-similar'>
      <div className={styles.similarInner}>
        <div className={styles.sectionHead}>
          <h2 id='place-similar' className={styles.sectionTitle}>
            {t`Similar places`}
            <span className={styles.similarMuted}>
              {' '}
              {kind ? t`More ${ph({ kind: kind.toLowerCase() })} nearby.` : t`More places nearby.`}
            </span>
          </h2>
          <NextLink href={`/?kind=${business.kind}`} className={styles.sectionLink}>
            {t`See all ›`}
          </NextLink>
        </div>
        <NextFreeProvider slugs={others.map((place) => place.slug)}>
          <ul className={styles.similarTrack} data-edge-fade=''>
            {others.map((place) => (
              <li key={place.slug}>
                <BusinessCard business={place} />
              </li>
            ))}
          </ul>
        </NextFreeProvider>
      </div>
    </section>
  )
}
