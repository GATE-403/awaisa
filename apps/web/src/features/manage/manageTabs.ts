import type { Icon } from '@phosphor-icons/react'
import {
  CalendarBlank,
  Clock,
  ListBullets,
  Storefront,
  UsersThree,
} from '@phosphor-icons/react/ssr'

type ManageTab = 'schedule' | 'services' | 'masters' | 'hours' | 'profile'

// Settings-style coloured tiles: each section keeps one system colour everywhere it appears.
const MANAGE_TABS: { value: ManageTab; label: string; icon: Icon; tint: string }[] = [
  { value: 'schedule', label: 'Расписание', icon: CalendarBlank, tint: 'var(--system-red)' },
  { value: 'services', label: 'Услуги', icon: ListBullets, tint: 'var(--system-blue)' },
  { value: 'masters', label: 'Мастера', icon: UsersThree, tint: 'var(--system-orange)' },
  { value: 'hours', label: 'График', icon: Clock, tint: 'var(--system-indigo)' },
  { value: 'profile', label: 'Профиль', icon: Storefront, tint: 'var(--system-monogram-to)' },
]

const toManageTab = (value: string | null): ManageTab =>
  MANAGE_TABS.find((tab) => tab.value === value)?.value ?? 'schedule'

export type { ManageTab }
export { MANAGE_TABS, toManageTab }
