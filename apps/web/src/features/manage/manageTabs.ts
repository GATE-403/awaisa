type ManageTab = 'schedule' | 'services' | 'masters' | 'hours' | 'profile'

const MANAGE_TABS: { value: ManageTab; label: string }[] = [
  { value: 'schedule', label: 'Расписание' },
  { value: 'services', label: 'Услуги' },
  { value: 'masters', label: 'Мастера' },
  { value: 'hours', label: 'График' },
  { value: 'profile', label: 'Профиль' },
]

const toManageTab = (value: string | null): ManageTab =>
  MANAGE_TABS.find((tab) => tab.value === value)?.value ?? 'schedule'

export type { ManageTab }
export { MANAGE_TABS, toManageTab }
