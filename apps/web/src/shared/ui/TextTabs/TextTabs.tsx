'use client'

import NextLink from 'next/link'
import { useEffect, useRef } from 'react'
import styles from './TextTabs.module.css'

type TextTab = {
  label: string
  isActive: boolean
  /** A link tab (the view lives in the URL)… */
  href?: string
  /** …or a button tab over local state. */
  onSelect?: () => void
  /** A small muted count beside the label. */
  count?: number | string
  /** Button tabs: the tab's id and the panel it controls. */
  id?: string
  controls?: string
}

interface TextTabsProps {
  label: string
  items: TextTab[]
  /** `lg` for a page's main switch (the catalog's «Места · Услуги»). */
  size?: 'md' | 'lg'
}

// Underlined text tabs (only the chosen one marked, no rule under them), like the local nav on apple.com — the one tab style of the
// app: links when the view is in the URL, buttons (role=tab) when it is local state.
export const TextTabs = ({ label, items, size = 'md' }: TextTabsProps) => {
  const isButtons = items.some((item) => !item.href)
  const rowRef = useRef<HTMLDivElement & HTMLElement>(null)
  const activeIndex = items.findIndex((item) => item.isActive)
  const isFirstRef = useRef(true)

  // A row wider than the screen keeps the chosen tab in view («если я на табе, она должна быть
  // видна всегда»): scrolled sideways only (never the page), at once on open and when the row's
  // width changes (a phone turned, a window narrowed), smoothly when another tab is chosen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the chosen tab is what moves it
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const reveal = (behavior: ScrollBehavior) => {
      const active = row.querySelector<HTMLElement>('[aria-current="page"]')
      if (!active) return
      const gap = 16
      const left =
        active.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft
      const right = left + active.offsetWidth
      const isHidden = left - gap < row.scrollLeft || right + gap > row.scrollLeft + row.clientWidth
      if (!isHidden) return
      row.scrollTo({
        left: Math.max(0, left - (row.clientWidth - active.offsetWidth) / 2),
        behavior,
      })
    }
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    reveal(isFirstRef.current || isReduced ? 'auto' : 'smooth')
    isFirstRef.current = false
    let width = row.clientWidth
    const observer = new ResizeObserver(() => {
      if (row.clientWidth === width) return
      width = row.clientWidth
      reveal('auto')
    })
    observer.observe(row)
    return () => observer.disconnect()
  }, [activeIndex])
  const content = items.map((item) => {
    const inner = (
      <>
        {item.label}
        {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
      </>
    )
    if (item.href) {
      return (
        <NextLink
          key={item.href}
          href={item.href}
          scroll={false}
          className={styles.tab}
          aria-current={item.isActive ? 'page' : undefined}
        >
          {inner}
        </NextLink>
      )
    }
    return (
      <button
        key={item.label}
        type='button'
        role='tab'
        id={item.id}
        aria-controls={item.controls}
        aria-selected={item.isActive}
        aria-current={item.isActive ? 'page' : undefined}
        className={styles.tab}
        onClick={item.onSelect}
      >
        {inner}
      </button>
    )
  })

  return isButtons ? (
    <div ref={rowRef} className={styles.tabs} data-size={size}>
      <div className={styles.list} role='tablist' aria-label={label}>
        {content}
      </div>
    </div>
  ) : (
    <nav ref={rowRef} aria-label={label} className={styles.tabs} data-size={size}>
      <div className={styles.list}>{content}</div>
    </nav>
  )
}

export type { TextTab }
