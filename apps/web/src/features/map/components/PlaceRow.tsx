import NextLink from 'next/link'
import type { MapPlace } from '@/common/api/types'
import { BusinessTile } from '@/common/components/BusinessTile/BusinessTile'
import { useToday } from '@/common/hooks/useToday'
import { getKindLabel } from '@/constants/platform'
import { addDayKey, formatPrice } from '@/features/booking/bookingUtils'
import { useNextFree } from '@/features/catalog/components/BusinessCard/NextFreeProvider'
import styles from '../MapPage.module.css'
import { formatDistance } from '../mapUtils'

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
      <button type='button' className={styles.rowMain} onClick={onSelect}>
        {place.coverUrl ? (
          // biome-ignore lint/performance/noImgElement: already resized WebP from our API
          <img src={place.coverUrl} alt='' className={styles.thumb} loading='lazy' />
        ) : (
          <BusinessTile name={place.name} size='md' />
        )}
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{place.name}</span>
          <span className={styles.rowMeta}>
            {[getKindLabel(place.kind), place.address || place.branchName]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <span className={styles.rowLive}>
            {slot && when ? (
              <span className={styles.free} data-today={when === 'сегодня' || undefined}>
                Свободно {when} с {slot.time}
              </span>
            ) : (
              <span>от {formatPrice(place.minPrice)}</span>
            )}
          </span>
        </span>
        {place.distanceKm !== null && (
          <span className={styles.distance}>{formatDistance(place.distanceKm)}</span>
        )}
      </button>
      <NextLink href={`/${place.slug}/book?branch=${place.branchId}`} className={styles.book}>
        Записаться
      </NextLink>
    </li>
  )
}
