'use client'

import { CaretLeft, CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRef, useState } from 'react'
import { useT } from '@/shared/i18n'
import { gridImage } from '@/shared/lib/imageSizes'
import styles from './BusinessCard.module.css'

interface CardGalleryProps {
  /** The cover first, then the place's latest work photos. */
  pictures: string[]
  href: string
  /** The place's name: tells its arrows from other galleries' on the page. */
  name: string
}

// The place's pictures leafed through on the card itself (scroll snap, the finger's own
// momentum), dots at the top saying there are more, like stories; ‹ › with a mouse. Every
// picture is a link to the place, so a tap anywhere on it still opens the place.
export const CardGallery = ({ pictures, href, name }: CardGalleryProps) => {
  const t = useT()
  const trackRef = useRef<HTMLSpanElement>(null)
  const frame = useRef(0)
  const [index, setIndex] = useState(0)
  const hasMore = pictures.length > 1

  // Read once a frame, set only when the picture in view changes: no render per scrolled pixel.
  const handleScroll = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const track = trackRef.current
      if (!track?.clientWidth) return
      const next = Math.round(track.scrollLeft / track.clientWidth)
      setIndex((current) => (current === next ? current : next))
    })
  }

  const turn = (step: number) => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: step * track.clientWidth, behavior: 'smooth' })
  }

  return (
    <>
      <span
        ref={trackRef}
        className={styles.gallery}
        data-scrolls={hasMore || undefined}
        onScroll={hasMore ? handleScroll : undefined}
      >
        {pictures.map((url, pictureIndex) => (
          // The first picture is the card's link for keyboards and screen readers, named after the
          // place; the others are for pointers only.
          <NextLink
            key={url}
            href={href}
            className={styles.slide}
            tabIndex={pictureIndex === 0 ? undefined : -1}
            aria-hidden={pictureIndex === 0 ? undefined : true}
            aria-label={pictureIndex === 0 ? name : undefined}
            draggable={false}
          >
            {/* biome-ignore lint/performance/noImgElement: covers are already resized WebP from our API */}
            <img
              {...gridImage(url)}
              alt=''
              loading='lazy'
              decoding='async'
              className={styles.cover}
              data-card-media={pictureIndex === 0 ? '' : undefined}
              draggable={false}
            />
          </NextLink>
        ))}
      </span>
      {hasMore && (
        <>
          <span className={styles.dots} aria-hidden>
            {pictures.map((url, dotIndex) => (
              <span
                key={url}
                className={styles.dot}
                data-dot=''
                data-current={dotIndex === index ? '' : undefined}
              />
            ))}
          </span>
          <button
            type='button'
            className={styles.turn}
            data-side='start'
            aria-label={t('Previous photo: {name}', { name })}
            hidden={index === 0}
            onClick={() => turn(-1)}
          >
            <CaretLeft aria-hidden />
          </button>
          <button
            type='button'
            className={styles.turn}
            data-side='end'
            aria-label={t('Next photo: {name}', { name })}
            hidden={index === pictures.length - 1}
            onClick={() => turn(1)}
          >
            <CaretRight aria-hidden />
          </button>
        </>
      )}
    </>
  )
}
