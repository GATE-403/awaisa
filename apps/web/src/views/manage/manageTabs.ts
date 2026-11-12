type ManageTab =
  | 'schedule'
  | 'clients'
  | 'analytics'
  | 'reviews'
  | 'services'
  | 'promotions'
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
  { value: 'masters', label: 'Мастера' },
  { value: 'branches', label: 'Филиалы' },
  { value: 'hours', label: 'График' },
  { value: 'profile', label: 'Профиль' },
  { value: 'notifications', label: 'Уведомления' },
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

export type { ManageTab }
export { isSettingsTab, MAIN_TABS, SETTINGS_TABS, toManageTab }
