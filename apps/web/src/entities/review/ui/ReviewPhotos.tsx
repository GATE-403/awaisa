'use client'

import { useState } from 'react'
import { PhotoViewer } from '@/shared/ui/PhotoViewer/PhotoViewer'
import styles from './ReviewItem.module.css'

interface ReviewPhotosProps {
  photos: string[]
  /** «Айгерим С.» — names each picture for screen readers. */
  authorName: string
}

// The client's own pictures under their words: small squares that open full screen.
export const ReviewPhotos = ({ photos, authorName }: ReviewPhotosProps) => {
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
              aria-label={`Фото ${index + 1} из ${photos.length}`}
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
          label={`Фото из отзыва — ${authorName}`}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  )
}
