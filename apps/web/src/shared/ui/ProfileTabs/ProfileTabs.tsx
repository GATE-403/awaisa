'use client'

import type { ReactNode } from 'react'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { TextTabs } from '../TextTabs/TextTabs'
import styles from './ProfileTabs.module.css'

type ProfileTab<Value extends string> = {
  value: Value
  label: string
  count?: number
  /** The panel's id: also an anchor (`#services`) that opens this tab. */
  panelId: string
  panel: ReactNode
}

interface ProfileTabsProps<Value extends string> {
  label: string
  items: ProfileTab<Value>[]
  value: Value
  onChange: (value: Value) => void
  /** The open tab's one action at the end of the tabs' row (`ProfileTabAction`). */
  action?: ReactNode
}

interface ProfileTabActionProps {
  label: string
  icon: ReactNode
  href?: string
  onClick?: () => void
  /** Said by screen readers when it says more than the label. */
  ariaLabel?: string
  /** Phones: not drawn, so the tabs keep the row (the cabinet floats its action instead). */
  isHiddenOnPhone?: boolean
}

// A profile's sections as in Instagram: `TextTabs` with a count each, the open tab's one action
// at the row's end, and the panels under them. Every panel stays mounted; only the chosen shows.
export const ProfileTabs = <Value extends string>({
  label,
  items,
  value,
  onChange,
  action,
}: ProfileTabsProps<Value>) => (
  <>
    <div className={styles.row} data-profile-tabs=''>
      <TextTabs
        label={label}
        items={items.map((item) => ({
          label: item.label,
          count: item.count,
          isActive: item.value === value,
          onSelect: () => onChange(item.value),
          id: `${item.panelId}-tab`,
          controls: item.panelId,
        }))}
      />
      {action}
    </div>
    {items.map((item) => (
      <div
        key={item.value}
        id={item.panelId}
        role='tabpanel'
        aria-labelledby={`${item.panelId}-tab`}
        hidden={item.value !== value}
        className={styles.panel}
      >
        {item.panel}
      </div>
    ))}
  </>
)

export const ProfileTabAction = ({
  label,
  icon,
  href,
  onClick,
  ariaLabel,
  isHiddenOnPhone,
}: ProfileTabActionProps) => {
  const content = (
    <>
      {icon}
      {label}
    </>
  )
  const props = {
    className: styles.action,
    'aria-label': ariaLabel,
    'data-phone-hidden': isHiddenOnPhone || undefined,
  }
  if (href) {
    return (
      <NextLink href={href} {...props}>
        {content}
      </NextLink>
    )
  }
  return (
    <button type='button' onClick={onClick} {...props}>
      {content}
    </button>
  )
}
