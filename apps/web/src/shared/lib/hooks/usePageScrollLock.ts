'use client'

import { useEffect } from 'react'

// Locks the page behind a full-screen layer (the booking sheet) while it is on screen.
// An effect, not a CSS `html:has(...)` rule: with Cache Components, Next keeps visited routes in
// the DOM, hidden by React Activity, so a selector would keep matching on every other page.
// Activity runs effect cleanups when it hides a route, which releases the lock.
export const usePageScrollLock = () => {
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'

    return () => {
      root.style.overflow = previous
    }
  }, [])
}
