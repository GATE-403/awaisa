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
}

interface MenuItemProps extends Omit<ComponentProps<typeof BaseMenu.Item>, 'className'> {
  icon?: ReactNode
  variant?: 'default' | 'danger'
  className?: string
}

// iOS pull-down menu: a few actions next to the button that opened them, no sheet over the page.
const Menu = ({ trigger, label, children, className }: MenuProps) => (
  <BaseMenu.Root>
    <BaseMenu.Trigger className={className} aria-label={label}>
      {trigger}
    </BaseMenu.Trigger>
    <BaseMenu.Portal>
      <BaseMenu.Positioner className={styles.positioner} sideOffset={6} align='end'>
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

export type { MenuItemProps, MenuProps }
export { Menu, MenuItem, MenuSeparator }
