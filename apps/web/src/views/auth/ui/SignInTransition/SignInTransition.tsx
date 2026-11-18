'use client'

import { useEffect, useRef } from 'react'
import { LightWave } from '@/shared/ui/LightWave/LightWave'
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

export const SignInTransition = ({ name, onDone }: SignInTransitionProps) => {
  // The form re-renders every second (the resend countdown) with a new callback: the timer runs
  // once from the start and calls the latest one.
  const onDoneRef = useRef(onDone)
  const firstName = name.trim().split(/\s+/)[0] ?? ''

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const isCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const leave = window.setTimeout(
      () => onDoneRef.current(),
      isCalm ? LEAVE_QUICKLY : LEAVE_AFTER_WAVE,
    )
    return () => window.clearTimeout(leave)
  }, [])

  return (
    <output className={styles.overlay} aria-live='polite'>
      {/* The wave from the top edge, then its light keeps passing faintly under the greeting. */}
      <LightWave afterglow />
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
