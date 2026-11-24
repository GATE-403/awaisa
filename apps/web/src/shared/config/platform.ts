import { utcOffsetMinutes } from '@awaisa/region'
import type { BusinessKind } from '@/shared/api/types'
import { REGION } from '@/shared/config/region'

const PLATFORM = {
  name: 'Awaisa',
  tagline: 'Онлайн-запись в салоны и к мастерам Бишкека - без звонков.',
  // Every business of the installation books in its region's time (its offset when the page is
  // built or opened).
  utcOffsetMinutes: utcOffsetMinutes(REGION),
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
