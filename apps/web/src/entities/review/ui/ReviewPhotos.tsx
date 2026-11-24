'use client'

import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import { PhotoViewer } from '@/shared/ui/PhotoViewer/PhotoViewer'
import styles from './ReviewItem.module.css'

interface ReviewPhotosProps {
  photos: string[]
  /** «Aigerim S.» - names each picture for screen readers. */
  authorName: string
}

// The client's own pictures under their words: small squares that open full screen.
export const ReviewPhotos = ({ photos, authorName }: ReviewPhotosProps) => {
  const { t } = useLingui()
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
              aria-label={t`Photo ${ph({ index: index + 1 })} of ${ph({ total: photos.length })}`}
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
          label={t`Review photo: ${ph({ name: authorName })}`}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  )
}
