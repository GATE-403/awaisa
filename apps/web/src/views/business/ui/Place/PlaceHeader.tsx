import { Star } from '@phosphor-icons/react/ssr'
import { type CSSProperties, ViewTransition } from 'react'
import { BusinessTile, pickTint } from '@/entities/business'
import type { Business, Catalog, ReviewSummary } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import { OpenStatus } from './OpenStatus'
import styles from './Place.module.css'
import { PlaceActions } from './PlaceActions'

interface PlaceHeaderProps {
  business: Business
  catalog: Catalog
  reviews: ReviewSummary
}

// A place card like Maps: the picture, who and where, what you can do, and the facts that
// decide a visit (rating, prices, masters) in one strip.
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
              src={business.coverUrl}
              alt=''
              className={styles.coverImage}
              fetchPriority='high'
            />
          )}
        </figure>
      </ViewTransition>

      <div className={styles.identity}>
        <BusinessTile name={business.name} size='lg' className={styles.tile} />
        <div className={styles.identityText}>
          <h1 className={styles.name}>{business.name}</h1>
          {/* The facts that decide a visit, as one line of text — not a grid of boxes. */}
          <p className={styles.facts}>
            {rating !== null && (
              <span className={styles.rating}>
                <Star weight='fill' aria-hidden className={styles.factStar} />
                {rating.toFixed(1)}
                {reviews.count > 0 && <span className={styles.muted}> ({reviews.count})</span>}
              </span>
            )}
            <span>{getKindLabel(business.kind)}</span>
          </p>
          <p className={styles.where}>
            <OpenStatus hours={business.hours} />
            {address && <span className={styles.address}>{address}</span>}
          </p>
        </div>
      </div>

      {business.description && <p className={styles.description}>{business.description}</p>}

      <PlaceActions business={business} />
    </header>
  )
}
