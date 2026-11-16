import { CaretRight, Play } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { formatPrice } from '@/entities/booking'
import type { BusinessKind, FeedItem } from '@/shared/api/types'
import { sizedImage } from '@/shared/lib/imageSizes'
import styles from './WorkMosaic.module.css'

interface WorkMosaicProps {
  items: FeedItem[]
  kind: BusinessKind | undefined
  /** Which block of the feed this is: each takes the next works, every other one mirrored. */
  block: number
}

// Eleven on wide grids (a feature and a 5×2 beside it); 7 from 768px, 5 on phones.
const PER_BLOCK = 11

// The masters' work set into the services grid like Instagram's Explore: a tall picture and four
// smaller ones, again further down with the next works, the tall one switching sides. Each opens
// «Работы» on that photo.
export const WorkMosaic = ({ items, kind, block }: WorkMosaicProps) => {
  const shown = items.slice(block * PER_BLOCK, (block + 1) * PER_BLOCK)
  if (shown.length < 3) return null
  const feedHref = (start?: string) => {
    const params = new URLSearchParams()
    if (kind) params.set('kind', kind)
    if (start) params.set('start', start)
    const query = params.toString()
    return query ? `/feed?${query}` : '/feed'
  }
  const titleId = `work-mosaic-${block}`

  return (
    <section className={styles.mosaic} aria-labelledby={titleId}>
      {/* The first block says what these are; the later ones are more of the same. */}
      <div className={styles.head} data-quiet={block > 0 || undefined}>
        <h2 id={titleId} className={styles.title}>
          Работы мастеров
        </h2>
        <NextLink href={feedHref()} className={styles.all}>
          Смотреть все
          <CaretRight weight='bold' aria-hidden />
        </NextLink>
      </div>
      <ul className={styles.grid} data-mirror={block % 2 === 1 || undefined}>
        {shown.map((item, index) => (
          <li key={item.id} className={styles.cell} data-tall={index === 0 || undefined}>
            <NextLink
              href={feedHref(item.id)}
              className={styles.tile}
              data-card=''
              data-picture-frame=''
            >
              {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
              <img
                {...sizedImage(item.url, index === 0 ? 280 : 200)}
                alt=''
                className={styles.image}
                data-card-media=''
                loading='lazy'
                decoding='async'
              />
              <span className={styles.play} aria-hidden>
                <Play weight='fill' />
              </span>
              <span className={styles.caption}>
                <span className={styles.name}>{item.service?.name ?? item.business.name}</span>
                <span className={styles.meta}>
                  {item.service ? (
                    <>
                      <span className={styles.price}>{formatPrice(item.service.price)}</span>
                      {' · '}
                      {item.business.name}
                    </>
                  ) : (
                    item.business.name
                  )}
                </span>
              </span>
            </NextLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
