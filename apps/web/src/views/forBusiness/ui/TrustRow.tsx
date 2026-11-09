'use client'

import { useEffect, useState } from 'react'
import { BusinessTile } from '@/entities/business'
import { CLIENT_API_PREFIX } from '@/shared/config/api'
import styles from '../ForBusinessPage.module.css'

type Place = { slug: string; name: string }

// Fetched in the browser: the page itself stays fully static (SSG) and never waits for the API.
export const TrustRow = () => {
  const [places, setPlaces] = useState<Place[]>([])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${CLIENT_API_PREFIX}/businesses`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((items: Place[]) => setPlaces(items.slice(0, 16)))
      .catch(() => undefined)

    return () => controller.abort()
  }, [])

  // Repeated so the marquee loops without a gap.
  const loop = places.length > 0 ? [...places, ...places, ...places] : []

  return (
    <section className={styles.trust} aria-label='Уже на Awaisa'>
      <p className={styles.trustCaption}>
        Салоны, барбершопы и студии Бишкека. Уже на Awaisa{places.length > 0 ? ':' : '.'}
      </p>
      {loop.length > 0 && (
        <div className={styles.marquee}>
          <ul className={styles.marqueeTrack}>
            {loop.map((place, index) => (
              <li key={`${place.slug}-${index}`} title={place.name}>
                <BusinessTile name={place.name} size='md' />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
