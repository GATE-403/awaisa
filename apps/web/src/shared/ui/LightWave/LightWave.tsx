'use client'

import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { resolveColor } from '@/shared/lib/cssColor'
import styles from './LightWave.module.css'
import { startLightWave } from './lightWaveRenderer'

type Point = { x: number; y: number }

interface LightWaveProps {
  /** Where the light comes from, as a share of the box (x left→right, y top→bottom, 0–1). */
  origin?: Point
  /** 2–6 CSS colours or tokens (`--system-blue`, `#ff9500`), cycled around the front. */
  colors?: string[]
  /** The main wave, in milliseconds. */
  duration?: number
  /** After the wave, keep faint fronts of the same light coming until unmounted. */
  afterglow?: boolean
  /** 0–1.5: how bright the light is. */
  intensity?: number
  className?: string
  /** Once the main wave has passed (also without WebGL or under reduced motion). */
  onDone?: () => void
}

const TOP: Point = { x: 0.5, y: -0.02 }

// The prism's spectrum: the system colours in the order light splits into.
const SPECTRUM = [
  '--system-cyan',
  '--system-blue',
  '--system-purple',
  '--system-pink',
  '--system-orange',
  '--system-yellow',
]

const QUICK_DONE_MS = 300

// A wave of light filling its box (absolute, inset 0, behind or over the content as the caller
// places it): it plays once when mounted - remount with a new `key` to play again. Without WebGL a
// plain CSS flash of the same colours stands in; under reduced motion nothing moves.
export const LightWave = ({
  origin = TOP,
  colors = SPECTRUM,
  duration = 1500,
  afterglow = false,
  intensity = 1,
  className,
  onDone,
}: LightWaveProps) => {
  const boxRef = useRef<HTMLSpanElement>(null)
  const onDoneRef = useRef(onDone)
  const [fallback, setFallback] = useState<string | null>(null)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  // Played once, from the props it mounted with: the wave is a moment, not a live view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: replay by remounting with a new key
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const finish = () => onDoneRef.current?.()

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timer = window.setTimeout(finish, QUICK_DONE_MS)
      return () => window.clearTimeout(timer)
    }

    // A canvas of its own per run: a stopped run gives its WebGL context back, and a lost
    // context cannot be used again (React runs effects twice in development).
    const canvas = document.createElement('canvas')
    box.append(canvas)
    const stop = startLightWave(canvas, {
      origin,
      colors,
      duration,
      afterglow,
      intensity,
      onDone: finish,
    })
    if (stop) {
      return () => {
        stop()
        canvas.remove()
      }
    }

    canvas.remove()

    setFallback(colors.map(resolveColor).join(', '))
    const timer = window.setTimeout(finish, duration)
    return () => window.clearTimeout(timer)
  }, [])

  const style = {
    '--wave-x': `${origin.x * 100}%`,
    '--wave-y': `${origin.y * 100}%`,
    '--wave-duration': `${duration}ms`,
    ...(fallback ? { '--wave-colors': fallback } : {}),
  } as CSSProperties

  return (
    <span
      ref={boxRef}
      className={className ? `${styles.wave} ${className}` : styles.wave}
      style={style}
      aria-hidden='true'
    >
      {fallback && <span className={styles.flash} />}
    </span>
  )
}

export type { LightWaveProps, Point }
