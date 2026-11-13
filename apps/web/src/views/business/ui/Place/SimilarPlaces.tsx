import NextLink from 'next/link'
import { BusinessCard, NextFreeProvider } from '@/entities/business'
import type { Business, BusinessCard as BusinessCardData } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import styles from './Place.module.css'

interface SimilarPlacesProps {
  business: Business
  places: BusinessCardData[]
}

const SHOWN = 10

// «Похожие места» at the foot of a place: others of the same kind, as the catalog shows them —
// somewhere to go next when this one is full or far.
export const SimilarPlaces = ({ business, places }: SimilarPlacesProps) => {
  const others = places.filter((place) => place.slug !== business.slug).slice(0, SHOWN)
  if (others.length === 0) return null

  return (
    <section className={styles.similar} aria-labelledby='place-similar'>
      <div className={styles.similarInner}>
        <div className={styles.sectionHead}>
          <h2 id='place-similar' className={styles.sectionTitle}>
            Похожие места
            <span className={styles.similarMuted}>
              {' '}
              Ещё {getKindLabel(business.kind).toLowerCase() || 'места'} рядом.
            </span>
          </h2>
          <NextLink href={`/?kind=${business.kind}`} className={styles.sectionLink}>
            Смотреть все ›
          </NextLink>
        </div>
        <NextFreeProvider slugs={others.map((place) => place.slug)}>
          <ul className={styles.similarTrack}>
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
