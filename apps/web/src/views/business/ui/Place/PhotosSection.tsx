'use client'

import NextLink from 'next/link'
import { useState } from 'react'
import type { Business } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { PhotoViewer } from '@/shared/ui/PhotoViewer/PhotoViewer'
import styles from './Place.module.css'

interface PhotosSectionProps {
  business: Business
}

// A mosaic: the first photo large, the rest beside it — the work speaks before the copy.
// A tap opens the photos full screen, all of them, not only the five shown.
export const PhotosSection = ({ business }: PhotosSectionProps) => {
  const t = useT()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (business.photos.length === 0) return null
  const hiddenCount = business.photos.length - 5

  return (
    <section id='work' className={styles.section} aria-labelledby='place-work'>
      <div className={styles.sectionHead}>
        <h2 id='place-work' className={styles.sectionTitle}>
          {t('Работы')}
        </h2>
        <NextLink href={`/feed?business=${business.slug}`} className={styles.sectionLink}>
          {t('Смотреть с ценами ›')}
        </NextLink>
      </div>
      <ul className={styles.photos} data-count={Math.min(business.photos.length, 5)}>
        {business.photos.slice(0, 5).map((url, index) => (
          <li key={url} className={styles.photo}>
            <button
              type='button'
              className={styles.photoButton}
              onClick={() => setOpenIndex(index)}
            >
              <span className={styles.srOnly}>
                {t('Открыть фото {index} из {total}', {
                  index: index + 1,
                  total: business.photos.length,
                })}
              </span>
              {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
              <img src={url} alt='' loading='lazy' decoding='async' className={styles.photoImage} />
              {index === 4 && hiddenCount > 0 && (
                <span className={styles.photoMore} aria-hidden>
                  +{hiddenCount}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {openIndex !== null && (
        <PhotoViewer
          photos={business.photos}
          startIndex={openIndex}
          label={business.name}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  )
}
