import { Star } from '@phosphor-icons/react/ssr'
import { type CSSProperties, ViewTransition } from 'react'
import { formatPrice } from '@/entities/booking'
import { BusinessTile, pickTint } from '@/entities/business'
import type { Business, Catalog, ReviewSummary } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import { pluralize } from '@/shared/lib/plural'
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
  const services = catalog.services
  const rated = catalog.specialists.filter((specialist) => specialist.rating !== null)
  // Real reviews once there are any; until then the masters' ratings.
  const rating =
    reviews.count > 0
      ? reviews.average
      : rated.length > 0
        ? rated.reduce((sum, specialist) => sum + (specialist.rating ?? 0), 0) / rated.length
        : null
  const minPrice =
    services.length > 0 ? Math.min(...services.map((service) => service.price)) : null
  const address = [business.city, business.address].filter(Boolean).join(', ')
  const facts = [
    rating !== null && {
      label: 'Рейтинг',
      value: (
        <>
          {rating.toFixed(1)}
          <Star weight='fill' aria-hidden className={styles.factStar} />
        </>
      ),
      hint:
        reviews.count > 0
          ? pluralize(reviews.count, ['отзыв', 'отзыва', 'отзывов'])
          : 'по мастерам',
    },
    minPrice !== null && { label: 'Цены', value: `от ${formatPrice(minPrice)}`, hint: 'за услугу' },
    {
      label: 'Услуги',
      value: String(services.length),
      hint: pluralize(catalog.categories.length, ['раздел', 'раздела', 'разделов']),
    },
    { label: 'Мастера', value: String(catalog.specialists.length), hint: 'выберите своего' },
    business.branches.length > 1 && {
      label: 'Филиалы',
      value: String(business.branches.length),
      hint: business.city,
    },
  ].filter((fact) => fact !== false)

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
          <p className={styles.kind}>{getKindLabel(business.kind)}</p>
          <h1 className={styles.name}>{business.name}</h1>
          <p className={styles.where}>
            <OpenStatus hours={business.hours} />
            {address && <span className={styles.address}>{address}</span>}
          </p>
        </div>
      </div>

      {business.description && <p className={styles.description}>{business.description}</p>}

      <PlaceActions business={business} />

      <dl className={styles.facts}>
        {facts.map((fact) => (
          <div key={fact.label} className={styles.fact}>
            <dt className={styles.factLabel}>{fact.label}</dt>
            <dd className={styles.factValue}>{fact.value}</dd>
            <dd className={styles.factHint}>{fact.hint}</dd>
          </div>
        ))}
      </dl>
    </header>
  )
}
