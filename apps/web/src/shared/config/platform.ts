import type { BusinessKind } from '@/shared/api/types'

const PLATFORM = {
  name: 'Awaisa',
  tagline: 'Online booking with Bishkek salons and specialists: no calls.',
  // Kyrgyzstan has a single time zone; every business on the platform books in UTC+6.
  utcOffsetMinutes: 6 * 60,
}

const BUSINESS_KINDS: { value: BusinessKind; label: string }[] = [
  { value: 'beauty', label: 'Beauty salons' },
  { value: 'barber', label: 'Barbershops' },
  { value: 'nails', label: 'Nail studios' },
  { value: 'spa', label: 'SPA and massage' },
  { value: 'health', label: 'Health' },
  { value: 'other', label: 'Other' },
]

const getKindLabel = (kind: BusinessKind) =>
  BUSINESS_KINDS.find((item) => item.value === kind)?.label ?? ''

export { BUSINESS_KINDS, getKindLabel, PLATFORM }
