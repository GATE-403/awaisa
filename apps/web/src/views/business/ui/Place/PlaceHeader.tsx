import { Star } from '@phosphor-icons/react/ssr'
import { type CSSProperties, ViewTransition } from 'react'
import { BusinessTile, pickTint } from '@/entities/business'
import type { Business, Catalog, ReviewSummary } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import { fluidImage } from '@/shared/lib/imageSizes'
import { pluralize, pluralWord } from '@/shared/lib/plural'
import { AddressLine } from './AddressLine'
import { OpenStatus } from './OpenStatus'
import styles from './Place.module.css'
import { PlaceActions } from './PlaceActions'

interface PlaceHeaderProps {
  business: Business
  catalog: Catalog
  reviews: ReviewSummary
}

// A profile head like a social app's: the cover, the tile resting on its edge with the actions
// across from it, then the name, a quiet handle line (kind · street), the counts that decide a
// visit with bold numbers, whether it is open, and the description.
export const PlaceHeader = ({ business, catalog, reviews }: PlaceHeaderProps) => {
  const rated = catalog.specialists.filter((specialist) => specialist.rating !== null)
  // Real reviews once there are any; until then the masters' ratings.
  const rating =
    reviews.count > 0
      ? reviews.average
      : rated.length > 0
        ? rated.reduce((sum, specialist) => sum + (specialist.rating ?? 0), 0) / rated.length
        : null
  // The city is the same for everyone in the catalog; the street is what helps.
  const address = business.address || business.city
  const services = catalog.services.length
  const masters = catalog.specialists.length

  return (
    <header
      className={styles.header}
      style={{ '--tint': pickTint(business.name) } as CSSProperties}
    >
      <ViewTransition name={`business-${business.slug}`}>
        <figure className={styles.cover} data-empty={!business.coverUrl || undefined}>
          {business.coverUrl && (
            // biome-ignore lint/performance/noImgElement: already resized WebP from our API
            <img
              {...fluidImage(business.coverUrl)}
              alt=''
              className={styles.coverImage}
              fetchPriority='high'
            />
          )}
        </figure>
      </ViewTransition>

      <div className={styles.headerBody}>
        <div className={styles.topRow}>
          <BusinessTile
            name={business.name}
            logoUrl={business.logoUrl}
            size='lg'
            className={styles.tile}
          />
          <PlaceActions business={business} />
        </div>

        <div className={styles.identityText}>
          <h1 className={styles.name}>{business.name}</h1>
          <p className={styles.handle}>
            <span>{getKindLabel(business.kind)}</span>
            {address && <AddressLine address={address} />}
          </p>
          <p className={styles.stats}>
            {rating !== null && (
              <span className={styles.statRating}>
                <Star weight='fill' aria-hidden className={styles.factStar} />
                <strong>{rating.toFixed(1)}</strong>
                {reviews.count > 0 &&
                  ` · ${pluralize(reviews.count, ['отзыв', 'отзыва', 'отзывов'])}`}
              </span>
            )}
            {services > 0 && (
              <a href='#services' className={styles.stat}>
                <strong>{services}</strong> {pluralWord(services, ['услуга', 'услуги', 'услуг'])}
              </a>
            )}
            {masters > 0 && (
              <a href='#masters' className={styles.stat}>
                <strong>{masters}</strong> {pluralWord(masters, ['мастер', 'мастера', 'мастеров'])}
              </a>
            )}
          </p>
          <p className={styles.where}>
            <OpenStatus hours={business.hours} />
          </p>
        </div>

        {business.description && <p className={styles.description}>{business.description}</p>}
      </div>
    </header>
  )
}
