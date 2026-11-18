'use client'

import { Check } from '@phosphor-icons/react/ssr'
import { useEffect, useRef, useState } from 'react'
import styles from './SignInTransition.module.css'

interface SignInTransitionProps {
  /** Called once the cloud has swept the screen: navigate to where the person was going. */
  onDone: () => void
}

// Timings of the sweep (ms): the screen blurs and a cloud of the accent rises over it, then
// leaves through the top, leaving a quiet «Входим…» that turns into «Вы вошли».
const SIGNED_IN_AT = 1250
const LEAVE_AT = 1650

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const SignInTransition = ({ onDone }: SignInTransitionProps) => {
  const [isSignedIn, setIsSignedIn] = useState(false)
  // The form re-renders every second (the resend countdown) with a new callback: the timers run
  // once from the start and call the latest one.
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const isQuick = prefersReducedMotion()
    const signedIn = window.setTimeout(() => setIsSignedIn(true), isQuick ? 0 : SIGNED_IN_AT)
    const leave = window.setTimeout(() => onDoneRef.current(), isQuick ? 500 : LEAVE_AT)

    return () => {
      window.clearTimeout(signedIn)
      window.clearTimeout(leave)
    }
  }, [])

  return (
    <div className={styles.overlay} role='status' aria-live='polite'>
      <span className={styles.cloud} aria-hidden='true' />
      <span className={styles.status}>
        {isSignedIn ? (
          <>
            <span className={styles.check} aria-hidden='true'>
              <Check weight='bold' />
            </span>
            Вы вошли
          </>
        ) : (
          <>
            <span className={styles.spinner} aria-hidden='true' />
            Входим…
          </>
        )}
      </span>
    </div>
  )
}
