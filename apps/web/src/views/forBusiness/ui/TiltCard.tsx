'use client'

import type { PointerEvent, ReactNode } from 'react'
import styles from './TiltCard.module.css'

interface TiltCardProps {
  className?: string
  children: ReactNode
}

const MAX_TILT = 5

// A card that leans toward the pointer with a soft glare, like a physical object under light.
export const TiltCard = ({ className, children }: TiltCardProps) => {
  const handleMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    const style = event.currentTarget.style
    style.setProperty('--tilt-x', `${((0.5 - y) * MAX_TILT * 2).toFixed(2)}deg`)
    style.setProperty('--tilt-y', `${((x - 0.5) * MAX_TILT * 2).toFixed(2)}deg`)
    style.setProperty('--glare-x', `${(x * 100).toFixed(1)}%`)
    style.setProperty('--glare-y', `${(y * 100).toFixed(1)}%`)
  }

  const handleLeave = (event: PointerEvent<HTMLElement>) => {
    const style = event.currentTarget.style
    style.setProperty('--tilt-x', '0deg')
    style.setProperty('--tilt-y', '0deg')
  }

  return (
    <article
      className={className ? `${styles.card} ${className}` : styles.card}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {children}
      <span className={styles.glare} aria-hidden='true' />
    </article>
  )
}
