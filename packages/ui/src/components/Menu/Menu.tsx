'use client'

import { Menu as BaseMenu } from '@base-ui/react/menu'
import type { ComponentProps, ReactNode } from 'react'
import { cx } from '../../utils/className'
import styles from './Menu.module.css'

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

// iOS pull-down menu: a few actions next to the button that opened them, no sheet over the page.
const Menu = ({ trigger, label, children, className, align = 'end', onOpenChange }: MenuProps) => (
  <BaseMenu.Root onOpenChange={(isOpen) => onOpenChange?.(isOpen)}>
    <BaseMenu.Trigger className={className} aria-label={label}>
      {trigger}
    </BaseMenu.Trigger>
    <BaseMenu.Portal>
      <BaseMenu.Positioner className={styles.positioner} sideOffset={6} align={align}>
        <BaseMenu.Popup className={styles.popup}>{children}</BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  </BaseMenu.Root>
)

const MenuItem = ({ icon, variant = 'default', className, children, ...props }: MenuItemProps) => (
  <BaseMenu.Item className={cx(styles.item, className)} data-variant={variant} {...props}>
    <span>{children}</span>
    {icon && <span className={styles.icon}>{icon}</span>}
  </BaseMenu.Item>
)

const MenuSeparator = () => <BaseMenu.Separator className={styles.separator} />

interface MenuGroupProps {
  /** A quiet caption over the group's rows («Пожаловаться»). */
  label: string
  children: ReactNode
}

const MenuGroup = ({ label, children }: MenuGroupProps) => (
  <BaseMenu.Group>
    <BaseMenu.GroupLabel className={styles.groupLabel}>{label}</BaseMenu.GroupLabel>
    {children}
  </BaseMenu.Group>
)

interface MenuSubmenuProps {
  label: ReactNode
  icon?: ReactNode
  variant?: 'default' | 'danger'
  children: ReactNode
}

// A row that opens its own menu beside it, like a submenu on macOS (a tap opens it on phones).
const MenuSubmenu = ({ label, icon, variant = 'default', children }: MenuSubmenuProps) => (
  <BaseMenu.SubmenuRoot>
    <BaseMenu.SubmenuTrigger className={styles.item} data-variant={variant}>
      <span>{label}</span>
      {icon && <span className={styles.icon}>{icon}</span>}
    </BaseMenu.SubmenuTrigger>
    <BaseMenu.Portal>
      <BaseMenu.Positioner className={styles.positioner} sideOffset={4} alignOffset={-6}>
        <BaseMenu.Popup className={styles.popup}>{children}</BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  </BaseMenu.SubmenuRoot>
)

export type { MenuGroupProps, MenuItemProps, MenuProps, MenuSubmenuProps }
export { Menu, MenuGroup, MenuItem, MenuSeparator, MenuSubmenu }
