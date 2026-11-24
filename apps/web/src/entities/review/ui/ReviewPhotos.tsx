'use client'

import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { PhotoViewer } from '@/shared/ui/PhotoViewer/PhotoViewer'
import styles from './ReviewItem.module.css'

interface ReviewPhotosProps {
  photos: string[]
  /** «Aigerim S.» - names each picture for screen readers. */
  authorName: string
}

// The client's own pictures under their words: small squares that open full screen.
export const ReviewPhotos = ({ photos, authorName }: ReviewPhotosProps) => {
  const t = useT()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (photos.length === 0) return null

  return (
    <>
      <ul className={styles.photos}>
        {photos.map((url, index) => (
          <li key={url}>
            <button
              type='button'
              className={styles.photo}
              aria-label={t('Photo {index} of {total}', { index: index + 1, total: photos.length })}
              onClick={() => setOpenIndex(index)}
            >
              {/* biome-ignore lint/performance/noImgElement: uploads are already 1400px WebP */}
              <img src={url} alt='' loading='lazy' decoding='async' />
            </button>
          </li>
        ))}
      </ul>
      {openIndex !== null && (
        <PhotoViewer
          photos={photos}
          startIndex={openIndex}
          label={t('Review photo: {name}', { name: authorName })}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  )
}
