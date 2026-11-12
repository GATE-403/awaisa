type ManageTab =
  | 'schedule'
  | 'clients'
  | 'analytics'
  | 'reviews'
  | 'services'
  | 'promotions'
  | 'loyalty'
  | 'team'
  | 'masters'
  | 'branches'
  | 'hours'
  | 'profile'
  | 'notifications'

type TabItem = { value: ManageTab; label: string }

// Everyday work on top; setting the business up lives under one «Настройки» with its own row.
const SETTINGS_TABS: TabItem[] = [
  { value: 'services', label: 'Услуги' },
  { value: 'promotions', label: 'Акции' },
  { value: 'loyalty', label: 'Лояльность' },
  { value: 'masters', label: 'Мастера' },
  { value: 'branches', label: 'Филиалы' },
  { value: 'hours', label: 'График' },
  { value: 'profile', label: 'Профиль' },
  { value: 'notifications', label: 'Уведомления' },
  { value: 'team', label: 'Сотрудники' },
]

const MAIN_TABS: TabItem[] = [
  { value: 'schedule', label: 'Расписание' },
  { value: 'clients', label: 'Клиенты' },
  { value: 'analytics', label: 'Аналитика' },
  { value: 'reviews', label: 'Отзывы' },
]

const ALL_TABS = [...MAIN_TABS, ...SETTINGS_TABS]

const toManageTab = (value: string | null): ManageTab =>
  ALL_TABS.find((tab) => tab.value === value)?.value ?? 'schedule'

const isSettingsTab = (tab: ManageTab) => SETTINGS_TABS.some((item) => item.value === tab)

// What an administrator («staff») may open: the day's work, not money or setup.
const STAFF_TABS: ManageTab[] = ['schedule', 'clients', 'reviews']

const isTabAllowed = (tab: ManageTab, role: 'owner' | 'staff') =>
  role === 'owner' || STAFF_TABS.includes(tab)

export type { ManageTab }
export { isSettingsTab, isTabAllowed, MAIN_TABS, SETTINGS_TABS, toManageTab }
