import NextLink from 'next/link'
import { type CSSProperties, ViewTransition } from 'react'
import { BusinessTile, pickTint } from '@/entities/business/ui/BusinessTile/BusinessTile'
import type { BusinessCard as BusinessCardData } from '@/shared/api/types'
import styles from './BusinessCard.module.css'
import { CardGallery } from './CardGallery'
import { LiveStatus } from './LiveStatus'
import { ServicesCount } from './ServicesCount'

// Only what the card shows: the catalog hands its list to a client component, so every other
// field (the week's hours, the description) would be serialized into the page for nothing.
type PlaceCardData = Pick<
  BusinessCardData,
  'slug' | 'name' | 'coverUrl' | 'logoUrl' | 'rating' | 'servicesCount' | 'address' | 'photos'
>

const toPlaceCard = ({
  slug,
  name,
  coverUrl,
  logoUrl,
  rating,
  servicesCount,
  address,
  photos,
}: PlaceCardData): PlaceCardData => ({
  slug,
  name,
  coverUrl,
  logoUrl,
  rating,
  servicesCount,
  address,
  photos,
})

interface BusinessCardProps {
  business: PlaceCardData
}

// A place, told apart from a service card at a glance: the place's own logo beside its name,
// what a place has (rating, how many services) instead of a price, its pictures to leaf through
// (dots at the top, like stories) and its next free times as capsules that book them.
export const BusinessCard = ({ business }: BusinessCardProps) => {
  const href = `/${business.slug}`
  const pictures = [
    ...(business.coverUrl ? [business.coverUrl] : []),
    ...(business.photos ?? []),
  ].slice(0, 4)

  return (
    <article
      className={styles.card}
      data-card=''
      data-gallery={pictures.length > 0 || undefined}
      style={{ '--tint': pickTint(business.name) } as CSSProperties}
    >
      {/* Shares its name with the business page cover: the card grows into it on navigation. */}
      <ViewTransition name={`business-${business.slug}`}>
        <span className={styles.media} data-picture-frame={pictures.length > 0 ? '' : undefined}>
          {pictures.length > 0 ? (
            <CardGallery pictures={pictures} href={href} name={business.name} />
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
          {pictures.length > 0 && (
            <BusinessTile
              name={business.name}
              logoUrl={business.logoUrl}
              size='xs'
              className={styles.logo}
            />
          )}
          <h3 className={styles.title}>
            <NextLink href={href} className={styles.open}>
              {business.name}
            </NextLink>
          </h3>
        </span>
        <span className={styles.footer}>
          {business.rating ? (
            <span className={styles.rating}>★ {business.rating.toLocaleString('ru-RU')}</span>
          ) : null}
          <ServicesCount count={business.servicesCount} className={styles.services} />
          <span className={styles.address}>{business.address}</span>
        </span>
        <LiveStatus slug={business.slug} />
      </span>
    </article>
  )
}

export type { PlaceCardData }
export { toPlaceCard }
