'use client'

import { Trash } from '@phosphor-icons/react/ssr'
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { useT } from '@/shared/i18n'
import { haptic } from '@/shared/lib/nativeBridge'
import styles from './HoldButton.module.css'

interface HoldButtonProps {
  children: ReactNode
  /** Runs once the button has been held for `holdMs`. */
  onConfirm: () => void
  /** A UI glyph before the label; the bin by default. */
  icon?: ReactNode
  holdMs?: number
  disabled?: boolean
}

const HINT_MS = 1600
const KEYS = new Set(['Enter', ' '])

// A destructive action that asks to be held, not confirmed in a dialog: a soft red capsule fills
// from the left while it is pressed and acts when full; let go early and it drains back. A quick
// tap only says «Удерживайте». Works with a mouse, a finger and Space / Enter held down.
export const HoldButton = ({
  children,
  onConfirm,
  icon = <Trash weight='bold' aria-hidden />,
  holdMs = 1000,
  disabled = false,
}: HoldButtonProps) => {
  const t = useT()
  const hintId = useId()
  const timerRef = useRef(0)
  const hintTimerRef = useRef(0)
  const startedRef = useRef(0)
  const onConfirmRef = useRef(onConfirm)
  const [isHolding, setIsHolding] = useState(false)
  const [isHintShown, setIsHintShown] = useState(false)

  useEffect(() => {
    onConfirmRef.current = onConfirm
  })

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current)
      window.clearTimeout(hintTimerRef.current)
    },
    [],
  )

  const stop = (isEarly: boolean) => {
    window.clearTimeout(timerRef.current)
    timerRef.current = 0
    setIsHolding(false)
    if (!isEarly || performance.now() - startedRef.current > holdMs) return
    setIsHintShown(true)
    window.clearTimeout(hintTimerRef.current)
    hintTimerRef.current = window.setTimeout(() => setIsHintShown(false), HINT_MS)
  }

  const start = () => {
    if (disabled || timerRef.current) return
    startedRef.current = performance.now()
    setIsHolding(true)
    setIsHintShown(false)
    haptic('selection')
    timerRef.current = window.setTimeout(() => {
      timerRef.current = 0
      setIsHolding(false)
      haptic('warning')
      onConfirmRef.current()
    }, holdMs)
  }

  // The rest of the press is followed on the window, so a finger that slides off or a mouse let
  // go outside still ends it.
  const handlePointerDown = () => {
    start()
    const end = () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      window.removeEventListener('blur', end)
      if (timerRef.current) stop(true)
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('blur', end)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!KEYS.has(event.key)) return
    event.preventDefault()
    if (!event.repeat) start()
  }

  const handleKeyUp = (event: KeyboardEvent) => {
    if (!KEYS.has(event.key)) return
    event.preventDefault()
    if (timerRef.current) stop(true)
  }

  return (
    <button
      type='button'
      className={styles.button}
      style={{ '--hold-ms': `${holdMs}ms` } as CSSProperties}
      data-holding={isHolding || undefined}
      disabled={disabled}
      aria-describedby={hintId}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={() => timerRef.current && stop(false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className={styles.fill} aria-hidden />
      <span className={styles.label}>
        {icon}
        {isHintShown ? t('Удерживайте') : children}
      </span>
      <span id={hintId} className={styles.srOnly}>
        {t('Удерживайте, чтобы подтвердить')}
      </span>
    </button>
  )
}
