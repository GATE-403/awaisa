'use client'

import { useEffect } from 'react'

// Marks <html> with `data-<name>` while the calling component is on screen, for CSS that styles
// the shell around it (e.g. the header drops its edge under a business bar).
// Not `:root:has([data-…])`: Next keeps visited routes in the DOM, hidden by React Activity, so
// such a selector would still match on other pages. Activity cleans effects up when it hides.
export const useRootFlag = (name: string | null) => {
  useEffect(() => {
    if (!name) return
    const root = document.documentElement
    root.setAttribute(`data-${name}`, '')

    return () => root.removeAttribute(`data-${name}`)
  }, [name])
}
