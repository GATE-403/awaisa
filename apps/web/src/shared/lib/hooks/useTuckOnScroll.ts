'use client'

import { useEffect, useState } from 'react'

// Like a mini player over a tab bar: true while the page scrolls down (past the first 120px),
// false again on the way up — so a floating pill never sits on what is being read.
export const useTuckOnScroll = () => {
  const [isTucked, setIsTucked] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const handleScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        if (Math.abs(y - last) < 8) return
        setIsTucked(y > last && y > 120)
        last = y
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return isTucked
}
