import { Plus } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import type { BusinessCard as BusinessCardData } from '@/common/api/types'
import { BusinessTile, pickTint } from '@/common/components/BusinessTile/BusinessTile'
import { getKindLabel } from '@/constants/platform'
import { formatPrice } from '@/features/booking/bookingUtils'
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
    style={
      {
        '--tint': pickTint(business.name),
        viewTransitionName: `business-${business.slug}`,
      } as CSSProperties
    }
  >
    <span className={styles.media}>
      {business.coverUrl ? (
        // biome-ignore lint/performance/noImgElement: covers are already resized WebP from our API
        <img
          src={business.coverUrl}
          alt=''
          loading='lazy'
          decoding='async'
          className={styles.cover}
        />
      ) : (
        <BusinessTile name={business.name} size='lg' className={styles.tile} />
      )}
    </span>
    <span className={styles.body}>
      <span className={styles.eyebrow}>{getKindLabel(business.kind)}</span>
      <span className={styles.title}>{business.name}</span>
      <LiveStatus slug={business.slug} hours={business.hours} />
      <span className={styles.footer}>
        <span className={styles.price}>от {formatPrice(business.minPrice)}</span>
        <span className={styles.address}>{business.address}</span>
        <span className={styles.plus} aria-hidden='true'>
          <Plus weight='bold' />
        </span>
      </span>
    </span>
  </NextLink>
)
