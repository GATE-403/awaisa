'use client'

import { useEffect, useRef } from 'react'
import { GradientFlow } from '@/views/auth/ui/GradientFlow/GradientFlow'
import { playLightWave } from './lightWave'
import styles from './SignInTransition.module.css'

interface SignInTransitionProps {
  /** The person's first name for the greeting; empty → «Вы вошли» alone. */
  name: string
  /** Called once the wave has passed: navigate to where the person was going. */
  onDone: () => void
}

// The wave takes 1.5 s; the greeting rises as it passes the middle and stays a moment.
const LEAVE_AFTER_WAVE = 2300
const LEAVE_QUICKLY = 900

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const SignInTransition = ({ name, onDone }: SignInTransitionProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The form re-renders every second (the resend countdown) with a new callback: the timers run
  // once from the start and call the latest one.
  const onDoneRef = useRef(onDone)
  const firstName = name.trim().split(/\s+/)[0] ?? ''

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const stop = canvas && !prefersReducedMotion() ? playLightWave(canvas) : null
    const leave = window.setTimeout(
      () => onDoneRef.current(),
      stop ? LEAVE_AFTER_WAVE : LEAVE_QUICKLY,
    )

    return () => {
      stop?.()
      window.clearTimeout(leave)
    }
  }, [])

  return (
    <output className={styles.overlay} aria-live='polite'>
      {/* What the wave leaves behind: its light keeps passing faintly under the greeting. */}
      <span className={styles.trace}>
        <GradientFlow variant='glow' isOnDark />
      </span>
      <span className={styles.wave} aria-hidden='true'>
        <canvas ref={canvasRef} />
      </span>
      <span className={styles.greeting}>
        {firstName ? (
          <>
            <span className={styles.hello}>Привет, {firstName}</span>
            <span className={styles.note}>Вы вошли</span>
          </>
        ) : (
          <span className={styles.hello}>Вы вошли</span>
        )}
      </span>
    </output>
  )
}
