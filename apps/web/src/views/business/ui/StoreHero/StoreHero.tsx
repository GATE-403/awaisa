import { ViewTransition } from 'react'
import type { Business, Service } from '@/shared/api/types'
import { NextSlotAside } from './NextSlotAside'
import styles from './StoreHero.module.css'

interface StoreHeroProps {
  business: Business
  services: Service[]
}

export const StoreHero = ({ business, services }: StoreHeroProps) => {
  const service = services.find((item) => item.isPopular) ?? services[0]

  return (
    <>
      <header className={styles.hero}>
        <h1 className={styles.title}>
          {business.name}
          {business.description && (
            <span className={styles.titleMuted}>. {business.description}</span>
          )}
        </h1>
        {service && <NextSlotAside business={business} service={service} />}
      </header>
      {business.coverUrl && (
        // Shares its name with the catalog card, so the card grows into the cover.
        <ViewTransition name={`business-${business.slug}`}>
          <figure className={styles.cover}>
            {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
            <img
              src={business.coverUrl}
              alt=''
              className={styles.coverImage}
              fetchPriority='high'
            />
          </figure>
        </ViewTransition>
      )}
    </>
  )
}
