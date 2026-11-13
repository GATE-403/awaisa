import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { addDayKey, formatPrice } from '@/entities/booking'
import { BusinessTile, useNextFree } from '@/entities/business'
import type { MapPlace } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import { useToday } from '@/shared/lib/hooks/useToday'
import { sizedImage } from '@/shared/lib/imageSizes'
import styles from '@/views/map/MapPage.module.css'
import { formatDistance } from '@/views/map/mapUtils'

interface PlaceRowProps {
  place: MapPlace
  isSelected: boolean
  onSelect: () => void
}

export const PlaceRow = ({ place, isSelected, onSelect }: PlaceRowProps) => {
  const today = useToday()
  const nextFree = useNextFree()
  const slot = nextFree?.[place.slug]
  const when =
    slot && today
      ? slot.date === today.dayKey
        ? 'сегодня'
        : slot.date === addDayKey(today.dayKey, 1)
          ? 'завтра'
          : null
      : null

  return (
    <li
      id={`place-${place.branchId}`}
      className={styles.row}
      data-selected={isSelected || undefined}
    >
      {/* The whole row books at this branch; pointing at it shows the pin on the map. */}
      <NextLink
        href={`/${place.slug}/book?branch=${place.branchId}`}
        className={styles.rowMain}
        onMouseEnter={onSelect}
        onFocus={onSelect}
      >
        {place.coverUrl ? (
          // biome-ignore lint/performance/noImgElement: already resized WebP from our API
          <img
            {...sizedImage(place.coverUrl, 44)}
            alt=''
            className={styles.thumb}
            loading='lazy'
            decoding='async'
          />
        ) : (
          <BusinessTile name={place.name} size='md' />
        )}
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{place.name}</span>
          <span className={styles.rowMeta}>
            {slot && when ? (
              <span className={styles.free} data-today={when === 'сегодня' || undefined}>
                {when === 'сегодня' ? 'Сегодня' : 'Завтра'} с {slot.time}
              </span>
            ) : (
              <span>от {formatPrice(place.minPrice)}</span>
            )}
            {' · '}
            {place.address || place.branchName || getKindLabel(place.kind)}
          </span>
        </span>
        {place.distanceKm !== null && (
          <span className={styles.distance}>{formatDistance(place.distanceKm)}</span>
        )}
        <CaretRight weight='bold' aria-hidden className={styles.chevron} />
      </NextLink>
    </li>
  )
}
