'use client'

import { useEffect, useRef } from 'react'

// Calls `onReach` when an element near the end of a list comes within `margin` of the screen —
// the trigger for endless scroll. Returns the ref for that sentinel element.
export const useEndReached = (onReach: () => void, isEnabled: boolean, margin = 900) => {
  const ref = useRef<HTMLDivElement>(null)
  const callback = useRef(onReach)

  useEffect(() => {
    callback.current = onReach
  })

  useEffect(() => {
    const element = ref.current
    if (!element || !isEnabled) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callback.current()
      },
      { rootMargin: `0px 0px ${margin}px 0px` },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [isEnabled, margin])

  return ref
}
