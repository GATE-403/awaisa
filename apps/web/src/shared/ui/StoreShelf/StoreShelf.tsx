'use client'

import { CaretLeft, CaretRight } from '@phosphor-icons/react/ssr'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import styles from './StoreShelf.module.css'

interface StoreShelfProps {
  id?: string
  title: string
  subtitle?: string
  label: string
  size?: 'md' | 'sm' | 'wide'
  children: ReactNode
}

const EDGE_TOLERANCE = 4

export const StoreShelf = ({
  id,
  title,
  subtitle,
  label,
  size = 'md',
  children,
}: StoreShelfProps) => {
  const trackRef = useRef<HTMLUListElement>(null)
  const [canScrollBack, setCanScrollBack] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(false)
  const headingId = `${id ?? label}-heading`

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const update = () => {
      setCanScrollBack(track.scrollLeft > EDGE_TOLERANCE)
      setCanScrollForward(track.scrollLeft + track.clientWidth < track.scrollWidth - EDGE_TOLERANCE)
    }

    update()
    track.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    return () => {
      track.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return

    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section id={id} aria-labelledby={headingId} className={styles.shelf}>
      <h2 id={headingId} className={styles.heading}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}> {subtitle}</span>}
      </h2>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable from the keyboard (WCAG 2.1.1) */}
      <ul ref={trackRef} aria-label={label} className={styles.track} data-size={size} tabIndex={0}>
        {children}
      </ul>
      <div className={styles.paddles}>
        <button
          type='button'
          className={styles.paddle}
          aria-label='Назад'
          disabled={!canScrollBack}
          onClick={() => scrollByPage(-1)}
        >
          <CaretLeft weight='bold' aria-hidden />
        </button>
        <button
          type='button'
          className={styles.paddle}
          aria-label='Вперёд'
          disabled={!canScrollForward}
          onClick={() => scrollByPage(1)}
        >
          <CaretRight weight='bold' aria-hidden />
        </button>
      </div>
    </section>
  )
}
