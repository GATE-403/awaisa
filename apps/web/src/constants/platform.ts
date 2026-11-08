import type { BusinessKind } from '@/common/api/types'

const PLATFORM = {
  name: 'Awaisa',
  tagline: 'Онлайн-запись в салоны и к мастерам Бишкека — без звонков.',
  // Kyrgyzstan has a single time zone; every business on the platform books in UTC+6.
  utcOffsetMinutes: 6 * 60,
}

const BUSINESS_KINDS: { value: BusinessKind; label: string }[] = [
  { value: 'beauty', label: 'Салоны красоты' },
  { value: 'barber', label: 'Барбершопы' },
  { value: 'nails', label: 'Ногтевые студии' },
  { value: 'spa', label: 'SPA и массаж' },
  { value: 'health', label: 'Здоровье' },
  { value: 'other', label: 'Другое' },
]

const getKindLabel = (kind: BusinessKind) =>
  BUSINESS_KINDS.find((item) => item.value === kind)?.label ?? ''

export { BUSINESS_KINDS, getKindLabel, PLATFORM }
