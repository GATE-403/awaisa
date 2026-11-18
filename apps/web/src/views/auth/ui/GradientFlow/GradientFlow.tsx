'use client'

import { useEffect, useRef } from 'react'
import { FLOW_FRAGMENT, GLOW_FRAGMENT } from './flowShader'
import styles from './GradientFlow.module.css'
import { readColors, runShader } from './shaderCanvas'

interface GradientFlowProps {
  /**
   * `flow`: the welcome's waves of colour behind the hero. `glow`: full screen, the trace of the
   * wave of light — faint fronts from the top edge with a fading glow — under the greeting after
   * sign-in.
   */
  variant?: 'flow' | 'glow'
  /** The glow over black whatever the theme: under the light words of the sign-in transition. */
  isOnDark?: boolean
}

// The system colours the waves are made of, top to bottom: cool sky, violet, warm, then (after
// a dark trough) a soft lavender.
const FLOW_COLORS = {
  c0: '--system-blue',
  c1: '--system-indigo',
  c2: '--system-orange',
  c3: '--system-indigo',
  c4: '--system-purple',
}
const FILM_COLORS = {
  c0: '--system-blue',
  c1: '--system-purple',
  c2: '--system-pink',
  c3: '--system-orange',
}
const GLOW_COLORS = { b: '--color-background', ...FILM_COLORS }

// Living colour for the sign-in screen, drawn by a shader; paused off screen, one still frame
// under reduced motion, a CSS fallback without WebGL.
export const GradientFlow = ({ variant = 'flow', isOnDark = false }: GradientFlowProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const isGlow = variant === 'glow'
    const fragment = isGlow ? GLOW_FRAGMENT : FLOW_FRAGMENT
    const colors = readColors(
      isGlow ? (isOnDark ? { ...GLOW_COLORS, b: 'black' } : GLOW_COLORS) : FLOW_COLORS,
    )
    const isStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let stop: (() => void) | null = null

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !stop) stop = runShader(canvas, fragment, colors, { isStill })
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
  }, [variant, isOnDark])

  return (
    <div
      className={styles.flow}
      data-variant={variant}
      data-on-dark={isOnDark || undefined}
      aria-hidden='true'
    >
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
