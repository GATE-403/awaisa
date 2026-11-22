'use client'

import { type RefObject, useEffect } from 'react'

const SETTLE_MS = 520

// The first element showing at the top of the screen, in the largest page part behind the sheet.
const findAnchor = (behind: HTMLElement[]) => {
  const page = behind.reduce<HTMLElement | null>(
    (largest, element) =>
      !largest || element.offsetHeight > largest.offsetHeight ? element : largest,
    null,
  )
  if (!page) return null
  let best: HTMLElement | null = null
  let bestTop = Number.POSITIVE_INFINITY
  for (const element of page.querySelectorAll<HTMLElement>('article, section, li, h2, p')) {
    const { top, height } = element.getBoundingClientRect()
    if (height > 0 && top >= 0 && top < bestTop) {
      best = element
      bestTop = top
    }
  }
  return best
}

// On phones the page under the booking sheet steps back like an iOS sheet's: it shrinks a little
// toward the top of the screen while the sheet is up and comes back as it is pulled down
// (`--sheet-pull`, written by `useSheetDrag`). Only the sheet's neighbours in the app's root are
// scaled, never an ancestor of it: a transformed ancestor would turn the fixed sheet into a box
// that scrolls with the page. Each one scales about the middle of the screen's top edge,
// wherever it starts (the page is locked at its scroll, so the rect is where it shows): about the
// screen's middle, the pinned site header slid down and the cards scrolled above it showed
// through. The room it frees is at the foot, under the sheet. An effect: React Activity
// cleans it up when it hides the route, like `useRootFlag`.
export const useRecedePage = (ref: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const sheet = ref.current
    const root = sheet?.closest('.root')
    const isPhone = matchMedia('(max-width: 767px)').matches
    const isStill = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!sheet || !root || !isPhone || isStill) return

    const behind = [...root.children].filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        !element.contains(sheet) &&
        !element.matches('[data-keep-interactive], [aria-live]') &&
        getComputedStyle(element).display !== 'none',
    )
    for (const element of behind) {
      const box = element.getBoundingClientRect()
      element.style.transformOrigin = `${innerWidth / 2 - box.left}px ${-box.top}px`
      element.setAttribute('data-sheet-behind', '')
    }
    // The browser's scroll anchoring gives up inside the scaled page: content changing above what
    // is on screen (the first-visit line leaving after a booking) moved the catalog under the
    // sheet by its height. The anchor is kept by hand: the first element showing at the top of
    // the screen, put back in place whenever the page behind changes size.
    const anchor = findAnchor(behind)
    let anchorTop = anchor?.getBoundingClientRect().top ?? 0
    const keepAnchor = new ResizeObserver(() => {
      if (!anchor?.isConnected) return
      const shift = anchor.getBoundingClientRect().top - anchorTop
      if (Math.abs(shift) < 1) return
      // The scale's origin rides with the page box, so a scroll moves the shrunken page by as much
      // as it moves the page: the shift on screen is the scroll to make.
      window.scrollBy({ top: shift, behavior: 'instant' })
      anchorTop = anchor.getBoundingClientRect().top
    })
    for (const element of behind) keepAnchor.observe(element)

    const html = document.documentElement
    // A frame later, so it steps back with a glide instead of starting there.
    const raise = window.setTimeout(() => html.setAttribute('data-booking-sheet', ''), 30)

    return () => {
      keepAnchor.disconnect()
      window.clearTimeout(raise)
      html.removeAttribute('data-booking-sheet')
      html.style.removeProperty('--sheet-pull')
      // Comes forward with the same glide, then lets go of the marks.
      window.setTimeout(() => {
        if (html.hasAttribute('data-booking-sheet')) return
        for (const element of behind) {
          element.removeAttribute('data-sheet-behind')
          element.style.transformOrigin = ''
        }
      }, SETTLE_MS)
    }
  }, [ref])
}
