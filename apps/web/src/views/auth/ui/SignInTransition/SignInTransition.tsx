'use client'

import { useEffect, useRef } from 'react'
import { useT } from '@/shared/i18n'
import styles from './SignInTransition.module.css'

interface SignInTransitionProps {
  /** The person's first name for the greeting; empty → «You're signed in» alone. */
  name: string
  /** Called once the wave has passed: navigate to where the person was going. */
  onDone: () => void
}

// The beam's flare takes about a second; the greeting rises after it and stays a moment.
const LEAVE_AFTER_WAVE = 2300
const LEAVE_QUICKLY = 900

export const SignInTransition = ({ name, onDone }: SignInTransitionProps) => {
  // The form re-renders every second (the resend countdown) with a new callback: the timer runs
  // once from the start and calls the latest one.
  const t = useT()
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
      {/* No light of its own: the sign-in's prism beam flares and sweeps behind this blur
          (`GradientFlow flare`); a second wave on top read as another effect (the owner: it did not go together). */}
      <span className={styles.greeting}>
        {firstName ? (
          <>
            <span className={styles.hello}>{t('Hi, {name}', { name: firstName })}</span>
            <span className={styles.note}>{t('You are signed in')}</span>
          </>
        ) : (
          <span className={styles.hello}>{t('You are signed in')}</span>
        )}
      </span>
    </output>
  )
}
