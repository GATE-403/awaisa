import NextLink from 'next/link'
import { type CSSProperties, ViewTransition } from 'react'
import { formatPrice } from '@/entities/booking'
import { BusinessTile, pickTint } from '@/entities/business/ui/BusinessTile/BusinessTile'
import type { BusinessCard as BusinessCardData } from '@/shared/api/types'
import { sizedImage } from '@/shared/lib/imageSizes'
import styles from './BusinessCard.module.css'
import { LiveStatus } from './LiveStatus'

interface BusinessCardProps {
  business: BusinessCardData
}

// Apple Store product card: the picture first, then name, live availability and the price.
export const BusinessCard = ({ business }: BusinessCardProps) => (
  <NextLink
    href={`/${business.slug}`}
    className={styles.card}
    style={{ '--tint': pickTint(business.name) } as CSSProperties}
  >
    {/* Shares its name with the business page cover: the card grows into it on navigation. */}
    <ViewTransition name={`business-${business.slug}`}>
      <span className={styles.media}>
        {business.coverUrl ? (
          // biome-ignore lint/performance/noImgElement: covers are already resized WebP from our API
          <img
            {...sizedImage(business.coverUrl, 420)}
            alt=''
            loading='lazy'
            decoding='async'
            className={styles.cover}
          />
        ) : (
          <BusinessTile name={business.name} size='lg' className={styles.tile} />
        )}
      </span>
    </ViewTransition>
    <span className={styles.body}>
      <span className={styles.title}>{business.name}</span>
      <LiveStatus slug={business.slug} />
      <span className={styles.footer}>
        <span className={styles.price}>от {formatPrice(business.minPrice)}</span>
        <span className={styles.address}>{business.address}</span>
      </span>
    </span>
  </NextLink>
)
