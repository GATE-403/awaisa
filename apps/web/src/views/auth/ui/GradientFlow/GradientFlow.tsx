'use client'

import { useEffect, useRef } from 'react'
import { type Palette, startFlow } from './flowShader'
import styles from './GradientFlow.module.css'

// The system colours the waves are made of, top to bottom: cool sky, violet, warm, then (after
// a dark trough) a soft lavender.
const PALETTE_TOKENS = [
  '--system-blue',
  '--system-indigo',
  '--system-orange',
  '--system-indigo',
  '--system-purple',
]

// The sign-in screen's backdrop: slow living colour behind the mascot and the headline, melting
// into the page where the form starts. Paused off screen; one still frame under reduced motion.
export const GradientFlow = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const styles = getComputedStyle(document.documentElement)
    const palette = PALETTE_TOKENS.map((token) => styles.getPropertyValue(token).trim()) as Palette
    const isStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let stop: (() => void) | null = null

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !stop) stop = startFlow(canvas, palette, isStill)
      if (!entry?.isIntersecting && stop) {
        stop()
        stop = null
      }
    })
    observer.observe(canvas)

    return () => {
      observer.disconnect()
      stop?.()
    }
  }, [])

  return (
    <div className={styles.flow} aria-hidden='true'>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
