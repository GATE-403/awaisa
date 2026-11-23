'use client'

import { type ReactNode, useRef } from 'react'
import { useKeyboardLift } from '@/shared/lib/hooks/useKeyboardLift'
import styles from './FloatingToolbar.module.css'

interface FloatingToolbarProps {
  children: ReactNode
  /** Where it floats on phones: the middle of the foot, or its right corner when the middle is
   *  taken (a list's «Ещё N …» capsule floats there). */
  align?: 'center' | 'end'
  className?: string
}

// A section's own tools (a period switch, a few thin glyphs): one row in the section's header on
// wide screens; on phones one capsule in the material floating over the window's foot, like the
// schedule's toolbar, so the head stays one line and the tools sit under the thumb. The page pads
// its foot by `--floating-toolbar-space` so its last row scrolls out from under it. A search in it
// rides up on the Android app's keyboard by itself (`useKeyboardLift`).
export const FloatingToolbar = ({
  children,
  align = 'center',
  className,
}: FloatingToolbarProps) => {
  const ref = useRef<HTMLDivElement>(null)
  useKeyboardLift(ref)

  return (
    <div
      ref={ref}
      className={className ? `${styles.toolbar} ${className}` : styles.toolbar}
      data-align={align}
    >
      {children}
    </div>
  )
}
