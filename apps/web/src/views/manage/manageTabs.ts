type ManageTab =
  | 'schedule'
  | 'analytics'
  | 'services'
  | 'masters'
  | 'branches'
  | 'hours'
  | 'profile'

const MANAGE_TABS: { value: ManageTab; label: string }[] = [
  { value: 'schedule', label: 'Расписание' },
  { value: 'analytics', label: 'Аналитика' },
  { value: 'services', label: 'Услуги' },
  { value: 'masters', label: 'Мастера' },
  { value: 'branches', label: 'Филиалы' },
  { value: 'hours', label: 'График' },
  { value: 'profile', label: 'Профиль' },
]

const toManageTab = (value: string | null): ManageTab =>
  MANAGE_TABS.find((tab) => tab.value === value)?.value ?? 'schedule'

export type { ManageTab }
export { MANAGE_TABS, toManageTab }
