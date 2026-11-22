'use client'

import { useEffect, useState } from 'react'
import { BusinessTile } from '@/entities/business'
import { CLIENT_API_PREFIX } from '@/shared/config/api'
import { useT } from '@/shared/i18n'
import styles from '../ForBusinessPage.module.css'

type Place = { slug: string; name: string }

const MIN_MARQUEE = 6

// Fetched in the browser: the page itself stays fully static (SSG) and never waits for the API.
export const TrustRow = () => {
  const t = useT()
  const [places, setPlaces] = useState<Place[]>([])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${CLIENT_API_PREFIX}/businesses`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((items: Place[]) => setPlaces(items.slice(0, 16)))
      .catch(() => undefined)

    return () => controller.abort()
  }, [])

  // A marquee only makes sense with enough places; a few are shown as a calm row.
  const isMarquee = places.length >= MIN_MARQUEE
  const items = isMarquee ? [...places, ...places, ...places] : places

  return (
    <section className={styles.trust} aria-label={t('Уже на Awaisa')}>
      <p className={styles.trustCaption}>
        {t(
          places.length > 0
            ? 'Салоны, барбершопы и студии Бишкека. Уже на Awaisa:'
            : 'Салоны, барбершопы и студии Бишкека. Уже на Awaisa.',
        )}
      </p>
      {items.length > 0 && (
        <div className={styles.marquee} data-static={!isMarquee || undefined}>
          <ul className={styles.marqueeTrack}>
            {items.map((place, index) => (
              <li key={`${place.slug}-${index}`} className={styles.place}>
                <BusinessTile name={place.name} size='sm' />
                {place.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
