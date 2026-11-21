'use client'

import { type RefObject, useEffect, useState } from 'react'

// Whether a `position: sticky` element is pinned at its `top` (it then takes the page colour and a
// hairline). Read on scroll, not by an IntersectionObserver: the cabinet bar sets its height (the
// sticky top) after mount, so a margin worked out at mount went stale.
export const useIsStuck = (ref: RefObject<HTMLElement | null>) => {
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    let frame = 0
    const check = () => {
      frame = 0
      const top = Number.parseFloat(getComputedStyle(element).top) || 0
      setIsStuck(window.scrollY > 0 && element.getBoundingClientRect().top <= top + 1)
    }
    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(frame)
    }
  }, [ref])

  return isStuck
}
