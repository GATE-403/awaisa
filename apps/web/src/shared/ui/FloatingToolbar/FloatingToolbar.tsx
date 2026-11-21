import type { ReactNode } from 'react'
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
// its foot by `--floating-toolbar-space` so its last row scrolls out from under it.
export const FloatingToolbar = ({
  children,
  align = 'center',
  className,
}: FloatingToolbarProps) => (
  <div className={className ? `${styles.toolbar} ${className}` : styles.toolbar} data-align={align}>
    {children}
  </div>
)
