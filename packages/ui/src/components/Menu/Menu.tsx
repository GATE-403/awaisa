'use client'

import { Menu as BaseMenu } from '@base-ui/react/menu'
import { CaretRightIcon } from '@phosphor-icons/react/ssr'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../utils/className'
import { MENU_ITEM, MENU_LABEL, MENU_POPUP, MENU_POSITIONER, MENU_SEPARATOR } from './menuClasses'

interface MenuProps {
  /** The button that opens the menu (rendered as the trigger). */
  trigger: ReactNode
  label: string
  children: ReactNode
  className?: string
  /** Which edge of the trigger the menu lines up with (`end` by default, for buttons on the right). */
  align?: 'start' | 'center' | 'end'
  /** Called when the menu opens or closes (e.g. to load its items on first open). */
  onOpenChange?: (isOpen: boolean) => void
}

interface MenuItemProps extends Omit<ComponentProps<typeof BaseMenu.Item>, 'className'> {
  icon?: ReactNode
  variant?: 'default' | 'danger'
  className?: string
}

// shadcn's dropdown menu: a few actions next to the button that opened them.
const Menu = ({ trigger, label, children, className, align = 'end', onOpenChange }: MenuProps) => (
  <BaseMenu.Root onOpenChange={(isOpen) => onOpenChange?.(isOpen)}>
    <BaseMenu.Trigger data-slot='dropdown-menu-trigger' className={className} aria-label={label}>
      {trigger}
    </BaseMenu.Trigger>
    <BaseMenu.Portal>
      <BaseMenu.Positioner className={MENU_POSITIONER} sideOffset={4} align={align}>
        <BaseMenu.Popup data-slot='dropdown-menu-content' className={MENU_POPUP}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  </BaseMenu.Root>
)

const MenuItem = ({ icon, variant = 'default', className, children, ...props }: MenuItemProps) => (
  <BaseMenu.Item
    data-slot='dropdown-menu-item'
    data-variant={variant}
    className={cn(MENU_ITEM, className)}
    {...props}
  >
    <span className='flex-1'>{children}</span>
    {icon && <span className='flex text-muted-foreground'>{icon}</span>}
  </BaseMenu.Item>
)

const MenuSeparator = () => (
  <BaseMenu.Separator data-slot='dropdown-menu-separator' className={MENU_SEPARATOR} />
)

interface MenuGroupProps {
  /** A quiet caption over the group's rows («Пожаловаться»). */
  label: string
  children: ReactNode
}

const MenuGroup = ({ label, children }: MenuGroupProps) => (
  <BaseMenu.Group data-slot='dropdown-menu-group'>
    <BaseMenu.GroupLabel data-slot='dropdown-menu-label' className={MENU_LABEL}>
      {label}
    </BaseMenu.GroupLabel>
    {children}
  </BaseMenu.Group>
)

interface MenuSubmenuProps {
  label: ReactNode
  icon?: ReactNode
  variant?: 'default' | 'danger'
  children: ReactNode
}

// A row that opens its own menu beside it (a tap opens it on phones).
const MenuSubmenu = ({ label, icon, variant = 'default', children }: MenuSubmenuProps) => (
  <BaseMenu.SubmenuRoot>
    <BaseMenu.SubmenuTrigger
      data-slot='dropdown-menu-sub-trigger'
      data-variant={variant}
      className={MENU_ITEM}
    >
      <span className='flex-1'>{label}</span>
      {icon && <span className='flex text-muted-foreground'>{icon}</span>}
      <CaretRightIcon className='ms-auto rtl:rotate-180' />
    </BaseMenu.SubmenuTrigger>
    <BaseMenu.Portal>
      <BaseMenu.Positioner className={MENU_POSITIONER} sideOffset={0} alignOffset={-3}>
        <BaseMenu.Popup
          data-slot='dropdown-menu-sub-content'
          className={cn(MENU_POPUP, 'shadow-lg')}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  </BaseMenu.SubmenuRoot>
)

export type { MenuGroupProps, MenuItemProps, MenuProps, MenuSubmenuProps }
export { Menu, MenuGroup, MenuItem, MenuSeparator, MenuSubmenu }
