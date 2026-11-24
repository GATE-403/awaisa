'use client'

import { Popover as BasePopover } from '@base-ui/react/popover'
import type { ReactNode } from 'react'
import { cx } from '../../utils/className'
import styles from './Popover.module.css'

interface PopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What it points at - a card on a board, a button. */
  anchor: Element | null
  /** Its name for screen readers (the popup is a dialog). */
  label: string
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

// A macOS inspector: a small surface beside what it is about, with an arrow to it and no dimmed
// page behind - Escape or a click elsewhere closes it. Controlled and anchored to any element, so
// a board can open it from its own cards without a trigger of its own.
const Popover = ({
  open,
  onOpenChange,
  anchor,
  label,
  children,
  side = 'right',
  className,
}: PopoverProps) => (
  <BasePopover.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
    <BasePopover.Portal>
      <BasePopover.Positioner
        className={styles.positioner}
        anchor={anchor}
        side={side}
        sideOffset={10}
        collisionPadding={12}
      >
        <BasePopover.Popup className={cx(styles.popup, className)} aria-label={label}>
          <BasePopover.Arrow className={styles.arrow} />
          {/* The content scrolls inside its own box: the popup itself never clips or scrolls, so
              the arrow hanging off its edge stays whole and adds no scrollbar. */}
          <div className={styles.body}>{children}</div>
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  </BasePopover.Root>
)

export type { PopoverProps }
export { Popover }
