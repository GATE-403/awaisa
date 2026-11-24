'use client'

import { Popover as BasePopover } from '@base-ui/react/popover'
import type { ReactNode } from 'react'
import { cn } from '../../utils/className'

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

// shadcn's popover, controlled and anchored to any element, so a board can open it from its own
// cards without a trigger of its own. Escape or a click elsewhere closes it.
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
        className='isolate z-[85]'
        anchor={anchor}
        side={side}
        sideOffset={8}
        collisionPadding={12}
      >
        <BasePopover.Popup
          data-slot='popover-content'
          aria-label={label}
          className={cn(
            'flex max-h-[min(var(--available-height),640px)] w-[min(352px,calc(100vw-24px))] origin-(--transform-origin) flex-col overflow-y-auto overscroll-contain rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className,
          )}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  </BasePopover.Root>
)

export type { PopoverProps }
export { Popover }
