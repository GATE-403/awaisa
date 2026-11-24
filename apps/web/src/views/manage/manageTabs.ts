import type { PlanFeature } from '@/shared/api/types'

type ManageTab =
  | 'schedule'
  | 'clients'
  | 'analytics'
  | 'cash'
  | 'reviews'
  | 'services'
  | 'promotions'
  | 'loyalty'
  | 'stock'
  /** «Касса» in settings: fiscal receipts (the main «Касса» tab is `cash`). */
  | 'fiscal'
  | 'team'
  | 'masters'
  | 'branches'
  | 'hours'
  | 'page'
  | 'notifications'
  | 'billing'
  /** The settings list itself: on phones the iOS Settings root, on wide screens the first section. */
  | 'settings'

type TabItem = { value: ManageTab; label: string }

type SettingsTone = 'blue' | 'green' | 'orange' | 'red' | 'gray'

type SettingsItem = TabItem & { tone: SettingsTone }

// Setting the business up, grouped like macOS System Settings: the place and its people, the
// sales. Services, masters and hours live on «Страница», where clients see them (old links to
// them land there, `toManageTab`); the settings search still finds them.
const SETTINGS_GROUPS: { label: string; items: SettingsItem[] }[] = [
  {
    label: 'Бизнес',
    items: [
      { value: 'branches', label: 'Филиалы', tone: 'green' },
      { value: 'notifications', label: 'Уведомления', tone: 'red' },
      { value: 'team', label: 'Сотрудники', tone: 'gray' },
      { value: 'billing', label: 'Тариф', tone: 'blue' },
    ],
  },
  {
    label: 'Продажи',
    items: [
      { value: 'promotions', label: 'Акции', tone: 'red' },
      { value: 'loyalty', label: 'Лояльность', tone: 'green' },
      { value: 'stock', label: 'Склад', tone: 'blue' },
      { value: 'fiscal', label: 'Касса', tone: 'gray' },
    ],
  },
]

const SETTINGS_TABS: TabItem[] = SETTINGS_GROUPS.flatMap((group) => group.items)

const MAIN_TABS: TabItem[] = [
  { value: 'schedule', label: 'Расписание' },
  { value: 'clients', label: 'Клиенты' },
  { value: 'analytics', label: 'Аналитика' },
  // The counter is daily work (shifts, sales), so it sits beside the schedule, not in settings.
  { value: 'cash', label: 'Касса' },
  { value: 'reviews', label: 'Отзывы' },
  // The public page itself, edited in place: the business's profile, not a settings row.
  { value: 'page', label: 'Страница' },
]

const ALL_TABS: TabItem[] = [
  ...MAIN_TABS,
  ...SETTINGS_TABS,
  { value: 'settings', label: 'Настройки' },
]

/** Sections that moved to «Страница» (its tab of the same name opens): old links land there. */
const PAGE_SECTIONS: Partial<Record<string, 'services' | 'masters' | 'hours'>> = {
  services: 'services',
  masters: 'masters',
  hours: 'hours',
}

// «Настройки → Профиль» became the «Страница» tab, and so did services, masters and hours.
const toManageTab = (value: string | null): ManageTab => {
  if (value === 'profile' || (value && PAGE_SECTIONS[value])) return 'page'
  return ALL_TABS.find((tab) => tab.value === value)?.value ?? 'schedule'
}

const isSettingsTab = (tab: ManageTab) =>
  tab === 'settings' || SETTINGS_TABS.some((item) => item.value === tab)

// What an administrator («staff») may open: the day's work, not money or setup. The counter
// is the day's work too (shifts and sales); its expenses stay the owner's.
const STAFF_TABS: ManageTab[] = ['schedule', 'clients', 'cash', 'reviews']

const isTabAllowed = (tab: ManageTab, role: 'owner' | 'staff') =>
  role === 'owner' || STAFF_TABS.includes(tab)

// Sections the free plan does not open: they show «Доступно на тарифе …» instead.
const TAB_FEATURES: Partial<Record<ManageTab, PlanFeature>> = {
  analytics: 'analytics',
  cash: 'cashdesk',
  promotions: 'promotions',
  loyalty: 'loyalty',
  stock: 'inventory',
  fiscal: 'fiscal',
}

/** The plan feature a section needs, or null when every plan has it. */
const tabFeature = (tab: ManageTab) => TAB_FEATURES[tab] ?? null

export type { ManageTab, SettingsItem, SettingsTone }
export {
  tabFeature,
  isSettingsTab,
  isTabAllowed,
  MAIN_TABS,
  PAGE_SECTIONS,
  SETTINGS_GROUPS,
  SETTINGS_TABS,
  toManageTab,
}
