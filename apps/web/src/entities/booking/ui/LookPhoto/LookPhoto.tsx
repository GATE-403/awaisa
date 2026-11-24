'use client'

import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { PhotoViewer } from '@/shared/ui/PhotoViewer/PhotoViewer'
import styles from './LookPhoto.module.css'

interface LookPhotoProps {
  url: string
  /** The client's name: names the picture for screen readers. */
  clientName: string
}

// «Хочу так»: the work the client booked from, beside the visit for the master. A small square
// with one footnote; a tap opens it full screen.
export const LookPhoto = ({ url, clientName }: LookPhotoProps) => {
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button type='button' className={styles.look} onClick={() => setIsOpen(true)}>
        {/* biome-ignore lint/performance/noImgElement: uploads are already resized WebP */}
        <img src={url} alt='' loading='lazy' decoding='async' className={styles.picture} />
        <span className={styles.caption}>{t('Wants this look')}</span>
      </button>
      {isOpen && (
        <PhotoViewer
          photos={[url]}
          startIndex={0}
          label={t('Reference from the client: {name}', { name: clientName })}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
