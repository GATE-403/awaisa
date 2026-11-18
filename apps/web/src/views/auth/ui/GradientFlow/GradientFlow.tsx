'use client'

import { useEffect, useRef } from 'react'
import { FLOW_FRAGMENT } from './flowShader'
import styles from './GradientFlow.module.css'
import { runShader } from './shaderCanvas'

// The system colours the waves are made of, top to bottom: cool sky, violet, warm, then (after
// a dark trough) a soft lavender.
const FLOW_COLORS = {
  c0: '--system-blue',
  c1: '--system-indigo',
  c2: '--system-orange',
  c3: '--system-indigo',
  c4: '--system-purple',
}

// The welcome's living colour behind the hero, drawn by a shader; paused off screen, one still
// frame under reduced motion, a CSS fallback without WebGL.
export const GradientFlow = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const isStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let stop: (() => void) | null = null

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !stop) {
        stop = runShader(canvas, FLOW_FRAGMENT, FLOW_COLORS, { isStill })
      }
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
