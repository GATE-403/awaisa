'use client'

import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu'
import type { ReactNode } from 'react'
import { cn } from '../../utils/className'
import { MENU_POPUP, MENU_POSITIONER } from '../Menu/menuClasses'

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
    <BaseContextMenu.Trigger
      data-slot='context-menu-trigger'
      className={cn('contents select-none', className)}
    >
      {children}
    </BaseContextMenu.Trigger>
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner className={MENU_POSITIONER}>
        <BaseContextMenu.Popup
          data-slot='context-menu-content'
          className={cn(MENU_POPUP, 'min-w-36')}
        >
          {menu}
        </BaseContextMenu.Popup>
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  </BaseContextMenu.Root>
)

export type { ContextMenuProps }
export { ContextMenu }
