import { Plural, useLingui } from '@lingui/react/macro'
import { Star } from '@phosphor-icons/react/ssr'
import { ViewTransition } from 'react'
import {
  PlaceCoverImage,
  PlaceDescription,
  PlaceLine,
  PlaceLogo,
  PlaceName,
  PlaceProfile,
} from '@/entities/business'
import type { Business, Catalog, PublicPromotion, ReviewSummary } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import { makeFormat } from '@/shared/i18n/format'
import { fluidImage } from '@/shared/lib/imageSizes'
import { AddressLine } from './AddressLine'
import { OpenStatus } from './OpenStatus'
import styles from './Place.module.css'
import { PlaceActions } from './PlaceActions'
import { PromotionsStrip } from './PromotionsStrip'

interface PlaceHeaderProps {
  business: Business
  catalog: Catalog
  reviews: ReviewSummary
  promotions: PublicPromotion[]
}

// The owner's «Page» as clients see it, laid out like a profile in Instagram: the cover, the
// logo on its edge with «Book» and the thin glyphs across from it, then a bio set close
// (name, kind · street, the rating, whether it is open, the description) and open promotions.
export const PlaceHeader = ({ business, catalog, reviews, promotions }: PlaceHeaderProps) => {
  const { t, i18n } = useLingui()
  const format = makeFormat(i18n)
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
    <PlaceProfile
      name={business.name}
      hasCover={Boolean(business.coverUrl)}
      // Only the catalog card → cover morph animates; while the page stays (the booking sheet
      // slides over it) the cover must not join the transition layer, which paints above it.
      coverFrame={(frame) => (
        <ViewTransition name={`business-${business.slug}`} update='none'>
          {frame}
        </ViewTransition>
      )}
      cover={
        business.coverUrl && (
          <PlaceCoverImage {...fluidImage(business.coverUrl)} fetchPriority='high' />
        )
      }
      logo={<PlaceLogo name={business.name} logoUrl={business.logoUrl} />}
      actions={<PlaceActions business={business} />}
      footer={<PromotionsStrip promotions={promotions} />}
    >
      <PlaceName as='h1'>{business.name}</PlaceName>
      <p className={styles.handle}>
        <span>{t(getKindLabel(business.kind))}</span>
        {address && <AddressLine address={address} />}
      </p>
      {rating !== null && (
        <PlaceLine>
          {reviews.count > 0 ? (
            <a href='#reviews' className={styles.stat}>
              <Star weight='fill' aria-hidden className={styles.factStar} />
              <strong>{format.rating(rating)}</strong>
              {' · '}
              <Plural value={reviews.count} one='# review' other='# reviews' />
            </a>
          ) : (
            <span className={styles.stat}>
              <Star weight='fill' aria-hidden className={styles.factStar} />
              <strong>{format.rating(rating)}</strong>
            </span>
          )}
        </PlaceLine>
      )}
      <PlaceLine>
        <OpenStatus hours={business.hours} />
      </PlaceLine>
      {business.description && <PlaceDescription>{business.description}</PlaceDescription>}
    </PlaceProfile>
  )
}
