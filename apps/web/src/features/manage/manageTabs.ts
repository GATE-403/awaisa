import type { Icon } from '@phosphor-icons/react'
import {
  CalendarBlank,
  Clock,
  ListBullets,
  Storefront,
  UsersThree,
} from '@phosphor-icons/react/ssr'

type ManageTab = 'schedule' | 'services' | 'masters' | 'hours' | 'profile'

const MANAGE_TABS: { value: ManageTab; label: string; icon: Icon }[] = [
  { value: 'schedule', label: 'Расписание', icon: CalendarBlank },
  { value: 'services', label: 'Услуги', icon: ListBullets },
  { value: 'masters', label: 'Мастера', icon: UsersThree },
  { value: 'hours', label: 'График', icon: Clock },
  { value: 'profile', label: 'Профиль', icon: Storefront },
]

const toManageTab = (value: string | null): ManageTab =>
  MANAGE_TABS.find((tab) => tab.value === value)?.value ?? 'schedule'

export type { ManageTab }
export { MANAGE_TABS, toManageTab }
