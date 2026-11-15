import NextLink from 'next/link'
import { type CSSProperties, ViewTransition } from 'react'
import { BusinessTile, pickTint } from '@/entities/business/ui/BusinessTile/BusinessTile'
import type { BusinessCard as BusinessCardData } from '@/shared/api/types'
import { gridImage } from '@/shared/lib/imageSizes'
import { pluralize } from '@/shared/lib/plural'
import styles from './BusinessCard.module.css'
import { LiveStatus } from './LiveStatus'

// Only what the card shows: the catalog hands its list to a client component, so every other
// field (the week's hours, the description) would be serialized into the page for nothing.
type PlaceCardData = Pick<
  BusinessCardData,
  'slug' | 'name' | 'coverUrl' | 'logoUrl' | 'rating' | 'servicesCount' | 'address'
>

const toPlaceCard = ({
  slug,
  name,
  coverUrl,
  logoUrl,
  rating,
  servicesCount,
  address,
}: PlaceCardData): PlaceCardData => ({
  slug,
  name,
  coverUrl,
  logoUrl,
  rating,
  servicesCount,
  address,
})

interface BusinessCardProps {
  business: PlaceCardData
}

// A place, told apart from a service card at a glance: the place's own logo beside its name and
// what a place has — rating and how many services — instead of a price.
export const BusinessCard = ({ business }: BusinessCardProps) => (
  <NextLink
    href={`/${business.slug}`}
    className={styles.card}
    data-card=''
    style={{ '--tint': pickTint(business.name) } as CSSProperties}
  >
    {/* Shares its name with the business page cover: the card grows into it on navigation. */}
    <ViewTransition name={`business-${business.slug}`}>
      <span className={styles.media}>
        {business.coverUrl ? (
          // biome-ignore lint/performance/noImgElement: covers are already resized WebP from our API
          <img
            {...gridImage(business.coverUrl)}
            alt=''
            loading='lazy'
            decoding='async'
            className={styles.cover}
            data-card-media=''
          />
        ) : (
          <BusinessTile
            name={business.name}
            logoUrl={business.logoUrl}
            size='lg'
            className={styles.tile}
          />
        )}
      </span>
    </ViewTransition>
    <span className={styles.body}>
      <span className={styles.place}>
        {business.coverUrl && (
          <BusinessTile
            name={business.name}
            logoUrl={business.logoUrl}
            size='xs'
            className={styles.logo}
          />
        )}
        <span className={styles.title}>{business.name}</span>
      </span>
      <span className={styles.footer}>
        {business.rating ? (
          <span className={styles.rating}>★ {business.rating.toLocaleString('ru-RU')}</span>
        ) : null}
        <span className={styles.services}>
          {pluralize(business.servicesCount, ['услуга', 'услуги', 'услуг'])}
        </span>
        <span className={styles.address}>{business.address}</span>
      </span>
      <LiveStatus slug={business.slug} />
    </span>
  </NextLink>
)

export type { PlaceCardData }
export { toPlaceCard }
