'use client'

import { type ReactNode, useEffect, useRef } from 'react'

interface FooterColumnProps {
  className: string
  children: ReactNode
}

const DESKTOP = '(min-width: 768px)'

// Closed disclosure rows on phones (apple.com), always-open columns on wide screens.
export const FooterColumn = ({ className, children }: FooterColumnProps) => {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const media = window.matchMedia(DESKTOP)
    const sync = () => {
      if (ref.current) ref.current.open = media.matches
    }
    sync()
    media.addEventListener('change', sync)

    return () => media.removeEventListener('change', sync)
  }, [])

  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  )
}
