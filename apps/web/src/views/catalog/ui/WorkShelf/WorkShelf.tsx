import { CaretRight, Play } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { formatPrice } from '@/entities/booking'
import type { BusinessKind, FeedItem } from '@/shared/api/types'
import { sizedImage } from '@/shared/lib/imageSizes'
import styles from './WorkShelf.module.css'

interface WorkShelfProps {
  items: FeedItem[]
  kind: BusinessKind | undefined
}

const SHOWN = 10

// A peek into «Работы»: tall thumbnails like a row of stories; each opens the feed on it.
export const WorkShelf = ({ items, kind }: WorkShelfProps) => {
  if (items.length < 3) return null
  const feedHref = (start?: string) => {
    const params = new URLSearchParams()
    if (kind) params.set('kind', kind)
    if (start) params.set('start', start)
    const query = params.toString()
    return query ? `/feed?${query}` : '/feed'
  }

  return (
    <section className={styles.shelf} aria-labelledby='work-shelf-title'>
      <div className={styles.head}>
        <h2 id='work-shelf-title' className={styles.title}>
          Работы мастеров
        </h2>
        <NextLink href={feedHref()} className={styles.all}>
          Смотреть все
          <CaretRight weight='bold' aria-hidden />
        </NextLink>
      </div>
      <ul className={styles.track} data-edge-fade=''>
        {items.slice(0, SHOWN).map((item) => (
          <li key={item.id}>
            <NextLink
              href={feedHref(item.id)}
              className={styles.card}
              data-card=''
              data-picture-frame=''
            >
              {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
              <img
                {...sizedImage(item.url, 160)}
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
                <span className={styles.placeName}>
                  {item.service ? (
                    <span className={styles.price}>{formatPrice(item.service.price)}</span>
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
