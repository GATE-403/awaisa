import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import { pickTint } from '@/entities/business'
import type { Business, Specialist } from '@/shared/api/types'
import { sizedImage } from '@/shared/lib/imageSizes'
import { WreathBadge } from '@/shared/ui/Wreath/Wreath'
import styles from './Place.module.css'

interface MastersSectionProps {
  business: Business
  specialists: Specialist[]
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

// Masters as the catalog's picture cards: the photo when there is one (initials on their own
// colour otherwise), first name, role and rating on the scrim; each books that master.
export const MastersSection = ({ business, specialists }: MastersSectionProps) => {
  if (specialists.length === 0) return null

  return (
    <section id='masters' className={styles.section} aria-labelledby='place-masters'>
      <div className={styles.sectionHead}>
        <h2 id='place-masters' className={styles.sectionTitle}>
          Мастера
        </h2>
        <span className={styles.sectionCount}>{specialists.length}</span>
        <NextLink
          href={business.kind === 'barber' ? '/top' : `/top?kind=${business.kind}`}
          className={styles.sectionLink}
        >
          Рейтинг ›
        </NextLink>
      </div>
      <ul className={styles.masters} data-edge-fade=''>
        {specialists.map((specialist) => (
          <li key={specialist.id}>
            <NextLink
              href={`/${business.slug}/book?specialist=${specialist.id}`}
              aria-label={`${specialist.name}, ${specialist.role || 'мастер'}`}
              className={styles.master}
              data-card=''
              style={{ '--tint': pickTint(specialist.name) } as CSSProperties}
            >
              {specialist.photoUrl ? (
                // biome-ignore lint/performance/noImgElement: already resized WebP from our API
                <img
                  {...sizedImage(specialist.photoUrl, 180)}
                  alt=''
                  className={styles.masterPhoto}
                  data-card-media=''
                  loading='lazy'
                  decoding='async'
                />
              ) : (
                <span className={styles.masterInitials} aria-hidden>
                  {initialsOf(specialist.name)}
                </span>
              )}
              {/* One of the platform's three best masters: a laurel emblem with the place. */}
              {specialist.rank && (
                <WreathBadge rank={specialist.rank} className={styles.masterWreath} />
              )}
              <span className={styles.masterCaption}>
                <span className={styles.masterName}>{specialist.name.split(' ')[0]}</span>
                <span className={styles.masterRole}>
                  {specialist.rating !== null && (
                    <span className={styles.masterRating}>
                      <Star weight='fill' aria-hidden />
                      {specialist.rating.toFixed(1)}
                    </span>
                  )}
                  {specialist.role}
                </span>
              </span>
            </NextLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
