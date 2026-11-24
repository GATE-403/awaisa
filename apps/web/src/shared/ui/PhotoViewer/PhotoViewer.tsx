'use client'

import { CaretLeft, CaretRight, X } from '@phosphor-icons/react/ssr'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/shared/i18n'
import { usePageScrollLock } from '@/shared/lib/hooks/usePageScrollLock'
import styles from './PhotoViewer.module.css'

interface PhotoViewerProps {
  photos: string[]
  /** The photo it opens on. */
  startIndex: number
  /** «Kings Barbershop, фото 3» - the alt text of each picture. */
  label: string
  onClose: () => void
}

// Photos full screen, like Photos on iOS: black, one at a time, swiped sideways with the finger's
// own momentum (scroll snap), arrows and keys with a mouse, ✕ or Escape to close.
export const PhotoViewer = ({ photos, startIndex, label, onClose }: PhotoViewerProps) => {
  usePageScrollLock()
  const t = useT()
  const trackRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    const track = trackRef.current
    if (track) track.scrollLeft = track.clientWidth * startIndex
    closeRef.current?.focus()
  }, [startIndex])

  const go = (next: number) => {
    const track = trackRef.current
    if (!track) return
    const target = Math.min(Math.max(next, 0), photos.length - 1)
    track.scrollTo({ left: track.clientWidth * target, behavior: 'smooth' })
  }

  const syncIndex = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setIndex(Math.round(track.scrollLeft / track.clientWidth))
  }

  const handleKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose()
    if (event.key === 'ArrowRight') go(index + 1)
    if (event.key === 'ArrowLeft') go(index - 1)
  }

  return createPortal(
    <div
      className={styles.viewer}
      role='dialog'
      aria-modal='true'
      aria-label={`${label}: ${t('photo {index} of {total}', { index: index + 1, total: photos.length })}`}
      onKeyDown={handleKey}
    >
      <div className={styles.bar}>
        <span className={styles.counter} aria-hidden>
          {t('{index} of {total}', { index: index + 1, total: photos.length })}
        </span>
        <button
          ref={closeRef}
          type='button'
          className={styles.close}
          onClick={onClose}
          aria-label={t('Close')}
        >
          <X aria-hidden />
        </button>
      </div>
      <div ref={trackRef} className={styles.track} onScroll={syncIndex}>
        {photos.map((url, photoIndex) => (
          <figure key={url} className={styles.slide}>
            {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
            <img
              src={url}
              alt={`${label}, ${t('photo {index}', { index: photoIndex + 1 })}`}
              className={styles.image}
              loading={Math.abs(photoIndex - startIndex) <= 1 ? 'eager' : 'lazy'}
              decoding='async'
            />
          </figure>
        ))}
      </div>
      {index > 0 && (
        <button
          type='button'
          className={styles.arrow}
          data-side='left'
          onClick={() => go(index - 1)}
          aria-label={t('Previous photo')}
        >
          <CaretLeft aria-hidden />
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          type='button'
          className={styles.arrow}
          data-side='right'
          onClick={() => go(index + 1)}
          aria-label={t('Next photo')}
        >
          <CaretRight aria-hidden />
        </button>
      )}
    </div>,
    document.body,
  )
}
