'use client'

import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu'
import type { ReactNode } from 'react'
import { cx } from '../../utils/className'
import menuStyles from '../Menu/Menu.module.css'
import styles from './ContextMenu.module.css'

interface ContextMenuProps {
  /** The area that opens the menu on a right click (or a long press on touch screens). */
  children: ReactNode
  /** The menu's items: the kit's `MenuItem` and `MenuSeparator`. */
  menu: ReactNode
  /** Off on touch screens where a long press already means something else (a drag). */
  disabled?: boolean
  className?: string
}

// The right-click twin of `Menu`: the same popup and items, opened at the pointer. The trigger
// takes no box of its own (`display: contents`), so it wraps any area without changing its layout.
const ContextMenu = ({ children, menu, disabled = false, className }: ContextMenuProps) => (
  <BaseContextMenu.Root disabled={disabled}>
    <BaseContextMenu.Trigger className={cx(styles.trigger, className)}>
      {children}
    </BaseContextMenu.Trigger>
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner className={menuStyles.positioner}>
        <BaseContextMenu.Popup className={cx(menuStyles.popup, styles.popup)}>
          {menu}
        </BaseContextMenu.Popup>
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  </BaseContextMenu.Root>
)

export type { ContextMenuProps }
export { ContextMenu }
