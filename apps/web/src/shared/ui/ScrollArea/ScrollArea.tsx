'use client'

import { CaretDown, CaretUp } from '@phosphor-icons/react/ssr'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import styles from './ScrollArea.module.css'

interface ScrollAreaProps {
  children: ReactNode
  /** Names the box for screen readers; it takes focus so the keyboard can scroll it too. */
  label: string
  /** Words for the rows still below, «Ещё 14 клиентов»: gets their count. */
  moreLabel: (count: number) => string
  /** Rows shown before the list scrolls; one more shows by half under the fade. */
  rows?: number
  className?: string
}

const DEFAULT_ROWS = 6

// A list that may run long, in a group of a page. Its height is measured from its own rows: up to
// `rows` it is a plain list, past them it shows `rows` and a half, the cut row fading under the
// edge, with «Ещё 14 клиентов ⌄» on the fade (a fade alone did not say there was more: «не понятно,
// что эти блоки скролятся»). With a mouse the box scrolls inside itself and the capsule moves it a
// page down. On touch screens it never scrolls inside: nested scrolls made the page hard to scroll
// with a finger, so the capsule opens the whole list in place and «Свернуть» folds it back, like
// `MoreFade`. A list that fits is never a scroll box at all (one that could move by a pixel caught
// the wheel and held the page still under the pointer).
export const ScrollArea = ({
  children,
  label,
  moreLabel,
  rows = DEFAULT_ROWS,
  className,
}: ScrollAreaProps) => {
  const boxRef = useRef<HTMLElement>(null)
  const isTouch = useMediaQuery('(pointer: coarse)')
  const [below, setBelow] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLong, setIsLong] = useState(false)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const items = () => box.querySelectorAll<HTMLElement>(':scope > * > li')
    // Rows not wholly in view under the box's bottom edge.
    const countBelow = () => {
      const isCut = box.dataset.scrolls !== undefined || box.dataset.folded !== undefined
      // A list that fits, or one scrolled to its end, has nothing below (its last row may end a
      // pixel past the box's edge).
      if (!isCut || box.scrollHeight - box.clientHeight - box.scrollTop < 2) {
        setBelow(0)
        return
      }
      const edge = box.getBoundingClientRect().bottom + 1
      setBelow([...items()].filter((item) => item.getBoundingClientRect().bottom > edge).length)
    }
    const measure = () => {
      const all = items()
      const first = all[0]
      const peek = all[rows]
      setIsLong(Boolean(peek))
      delete box.dataset.scrolls
      delete box.dataset.folded
      if (!first || !peek || (isTouch && isOpen)) {
        box.style.removeProperty('max-height')
      } else {
        // Both rows share one offset parent, so their difference is the height of `rows` rows.
        const height = peek.offsetTop - first.offsetTop + Math.round(peek.offsetHeight / 2)
        box.style.maxHeight = `${height}px`
        box.dataset[isTouch ? 'folded' : 'scrolls'] = ''
      }
      countBelow()
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box.firstElementChild ?? box)
    // Counted on every scroll and once more when it settles (snapping moves it after the last
    // scroll event); a few rows' boxes are cheap to read.
    box.addEventListener('scroll', countBelow, { passive: true })
    box.addEventListener('scrollend', countBelow)
    return () => {
      observer.disconnect()
      box.removeEventListener('scroll', countBelow)
      box.removeEventListener('scrollend', countBelow)
    }
  }, [rows, isTouch, isOpen])

  const showMore = () => {
    const box = boxRef.current
    if (!box) return
    if (isTouch) {
      setIsOpen(true)
      return
    }
    // A page down, less a row, so the row that was cut is the first one seen whole.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    box.scrollBy({ top: box.clientHeight * 0.75, behavior: reduce ? 'auto' : 'smooth' })
  }

  const fold = () => {
    setIsOpen(false)
    const box = boxRef.current
    if (!box || box.getBoundingClientRect().top >= 0) return
    // Folding a long list leaves the reader where it starts, not far below its end.
    box.scrollIntoView({ block: 'start' })
  }

  const isScrollBox = isLong && !isTouch

  return (
    <div className={styles.wrap}>
      <section
        ref={boxRef}
        className={className ? `${styles.area} ${className}` : styles.area}
        aria-label={label}
        // A scrollable region must be reachable by keyboard.
        tabIndex={isScrollBox ? 0 : undefined}
      >
        {children}
      </section>
      {below > 0 && (
        <button
          type='button'
          className={styles.more}
          onClick={showMore}
          // With a mouse the box itself is the keyboard's way to scroll; on touch this is the way.
          tabIndex={isTouch ? 0 : -1}
          aria-expanded={isTouch ? false : undefined}
        >
          {moreLabel(below)}
          <CaretDown weight='bold' aria-hidden />
        </button>
      )}
      {isTouch && isOpen && isLong && (
        <button type='button' className={styles.less} onClick={fold} aria-expanded>
          Свернуть
          <CaretUp weight='bold' aria-hidden />
        </button>
      )}
    </div>
  )
}
