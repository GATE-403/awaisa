'use client'

import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { CaretDown, CaretUp } from '@phosphor-icons/react/ssr'
import type { ReactNode } from 'react'
import styles from './MoreFade.module.css'

interface MoreFadeProps {
  children: ReactNode
  /** How many items wait behind the button (0 = nothing to show or hide). */
  hiddenCount: number
  isOpen: boolean
  onToggle: () => void
  /** «booking / bookings» for «N more …». */
  label: string
  /** What the fade melts into: the page, the card the list sits on, or a sheet's inset group. */
  surface?: 'page' | 'card' | 'sheet'
  /** «Hide» floats at the bottom of the screen while the open list is in view (default);
      false keeps it under the list - for short lists in a sheet with its own bottom bar. */
  isLessFloating?: boolean
}

// One expander for every long list: closed, the last shown item fades and «N more …» floats on
// the fade; open, a quiet «Hide» under the list folds it back.
export const MoreFade = ({
  children,
  hiddenCount,
  isOpen,
  onToggle,
  label,
  surface = 'page',
  isLessFloating = true,
}: MoreFadeProps) => {
  const { t } = useLingui()
  if (hiddenCount <= 0 && !isOpen) return <>{children}</>

  return (
    <div className={styles.wrap} data-closed={!isOpen || undefined} data-surface={surface}>
      {children}
      {isOpen ? (
        <button
          type='button'
          className={styles.less}
          data-inline={isLessFloating ? undefined : ''}
          onClick={onToggle}
          aria-expanded
        >
          {t`Hide`}
          <CaretUp aria-hidden />
        </button>
      ) : (
        <button type='button' className={styles.more} onClick={onToggle} aria-expanded={false}>
          {t`${ph({ count: hiddenCount })} more ${label}`}
          <CaretDown aria-hidden />
        </button>
      )}
    </div>
  )
}
