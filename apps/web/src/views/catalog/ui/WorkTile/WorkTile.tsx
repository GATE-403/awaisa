import { Play } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { formatPrice } from '@/entities/booking'
import { PersonAvatar } from '@/entities/business'
import type { BusinessKind, FeedItem } from '@/shared/api/types'
import { sizedImage } from '@/shared/lib/imageSizes'
import styles from './WorkTile.module.css'

interface WorkTileProps {
  item: FeedItem
  kind: BusinessKind | undefined
  /** A feature: two cards wide (and two tall from 768px), so the grid does not read as a list. */
  isBig?: boolean
}

// A master's work set into the services grid as one of its cells — the same shape, radius and
// scrim as the service cards, told apart by the play mark and the master's face: it opens
// «Работы» on this photo, where it books that service with that master.
export const WorkTile = ({ item, kind, isBig = false }: WorkTileProps) => {
  const params = new URLSearchParams({ start: item.id })
  if (kind) params.set('kind', kind)
  const author = item.specialist?.name.split(' ')[0]

  return (
    <NextLink
      href={`/feed?${params}`}
      className={styles.tile}
      data-big={isBig || undefined}
      data-card=''
      data-picture-frame=''
      aria-label={`Работа мастера: ${item.service?.name ?? item.business.name}, ${item.business.name}`}
    >
      {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
      <img
        {...sizedImage(item.url, isBig ? 640 : 320)}
        alt=''
        className={styles.image}
        data-card-media=''
        loading='lazy'
        decoding='async'
      />
      <span className={styles.play} aria-hidden>
        <Play weight='fill' />
      </span>
      <span className={styles.caption} aria-hidden>
        <span className={styles.author}>
          {item.specialist ? (
            <PersonAvatar
              name={item.specialist.name}
              src={item.specialist.photoUrl ?? undefined}
              size='sm'
              className={styles.face}
            />
          ) : null}
          <span className={styles.authorName}>
            {author ? `${author} · ${item.business.name}` : item.business.name}
          </span>
        </span>
        {item.service && <span className={styles.name}>{item.service.name}</span>}
        {item.service && <span className={styles.price}>{formatPrice(item.service.price)}</span>}
      </span>
    </NextLink>
  )
}
