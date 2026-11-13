type ManageTab =
  | 'schedule'
  | 'clients'
  | 'analytics'
  | 'reviews'
  | 'services'
  | 'promotions'
  | 'loyalty'
  | 'stock'
  | 'team'
  | 'masters'
  | 'branches'
  | 'hours'
  | 'profile'
  | 'notifications'
  /** The settings list itself: on phones the iOS Settings root, on wide screens the first section. */
  | 'settings'

type TabItem = { value: ManageTab; label: string }

type SettingsTone = 'blue' | 'green' | 'orange' | 'red' | 'gray'

type SettingsItem = TabItem & { tone: SettingsTone }

// Setting the business up, grouped like macOS System Settings: the place, the people, the sales.
const SETTINGS_GROUPS: { label: string; items: SettingsItem[] }[] = [
  {
    label: 'Бизнес',
    items: [
      { value: 'profile', label: 'Профиль', tone: 'blue' },
      { value: 'branches', label: 'Филиалы', tone: 'green' },
      { value: 'hours', label: 'График', tone: 'orange' },
      { value: 'notifications', label: 'Уведомления', tone: 'red' },
    ],
  },
  {
    label: 'Услуги и команда',
    items: [
      { value: 'services', label: 'Услуги', tone: 'blue' },
      { value: 'masters', label: 'Мастера', tone: 'orange' },
      { value: 'team', label: 'Сотрудники', tone: 'gray' },
    ],
  },
  {
    label: 'Продажи',
    items: [
      { value: 'promotions', label: 'Акции', tone: 'red' },
      { value: 'loyalty', label: 'Лояльность', tone: 'green' },
      { value: 'stock', label: 'Склад', tone: 'blue' },
    ],
  },
]

const SETTINGS_TABS: TabItem[] = SETTINGS_GROUPS.flatMap((group) => group.items)

const MAIN_TABS: TabItem[] = [
  { value: 'schedule', label: 'Расписание' },
  { value: 'clients', label: 'Клиенты' },
  { value: 'analytics', label: 'Аналитика' },
  { value: 'reviews', label: 'Отзывы' },
]

const ALL_TABS: TabItem[] = [
  ...MAIN_TABS,
  ...SETTINGS_TABS,
  { value: 'settings', label: 'Настройки' },
]

const toManageTab = (value: string | null): ManageTab =>
  ALL_TABS.find((tab) => tab.value === value)?.value ?? 'schedule'

const isSettingsTab = (tab: ManageTab) =>
  tab === 'settings' || SETTINGS_TABS.some((item) => item.value === tab)

// What an administrator («staff») may open: the day's work, not money or setup.
const STAFF_TABS: ManageTab[] = ['schedule', 'clients', 'reviews']

const isTabAllowed = (tab: ManageTab, role: 'owner' | 'staff') =>
  role === 'owner' || STAFF_TABS.includes(tab)

export type { ManageTab, SettingsItem, SettingsTone }
export { isSettingsTab, isTabAllowed, MAIN_TABS, SETTINGS_GROUPS, SETTINGS_TABS, toManageTab }
