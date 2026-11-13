'use client'

import { CaretDown, CaretUp } from '@phosphor-icons/react/ssr'
import type { ReactNode } from 'react'
import styles from './MoreFade.module.css'

interface MoreFadeProps {
  children: ReactNode
  /** How many items wait behind the button (0 = nothing to show or hide). */
  hiddenCount: number
  isOpen: boolean
  onToggle: () => void
  /** «запись / записи / записей» for «Ещё N …». */
  label: string
  /** What the fade melts into: the page, or the card the list sits on. */
  surface?: 'page' | 'card'
}

// One expander for every long list: closed, the last shown item fades and «Ещё N …» floats on
// the fade; open, a quiet «Скрыть» under the list folds it back.
export const MoreFade = ({
  children,
  hiddenCount,
  isOpen,
  onToggle,
  label,
  surface = 'page',
}: MoreFadeProps) => {
  if (hiddenCount <= 0 && !isOpen) return <>{children}</>

  return (
    <div className={styles.wrap} data-closed={!isOpen || undefined} data-surface={surface}>
      {children}
      {isOpen ? (
        <button type='button' className={styles.less} onClick={onToggle} aria-expanded>
          Скрыть
          <CaretUp weight='bold' aria-hidden />
        </button>
      ) : (
        <button type='button' className={styles.more} onClick={onToggle} aria-expanded={false}>
          Ещё {hiddenCount} {label}
          <CaretDown weight='bold' aria-hidden />
        </button>
      )}
    </div>
  )
}
