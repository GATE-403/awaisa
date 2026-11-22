'use client'

import { useEffect } from 'react'

// Locks the page behind a full-screen layer (the booking sheet) while it is on screen.
// An effect, not a CSS `html:has(...)` rule: with Cache Components, Next keeps visited routes in
// the DOM, hidden by React Activity, so a selector would keep matching on every other page.
// Activity runs effect cleanups when it hides a route, which releases the lock.
// `delayMs` waits for a layer that slides in: the root's overflow lays the whole page out again,
// and on a phone that cost frames of the slide (a Samsung A55, a long place page).
export const usePageScrollLock = (delayMs = 0) => {
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.overflow
    const lock = () => {
      root.style.overflow = 'hidden'
    }
    const timer = delayMs ? window.setTimeout(lock, delayMs) : 0
    if (!delayMs) lock()

    return () => {
      window.clearTimeout(timer)
      root.style.overflow = previous
    }
  }, [delayMs])
}
