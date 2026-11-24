import { utcOffsetMinutes } from '@awaisa/region'
import type { BusinessKind } from '@/shared/api/types'
import { REGION } from '@/shared/config/region'

const PLATFORM = {
  name: 'Awaisa',
  tagline: 'Online booking with salons and specialists: no calls.',
  // Every business of the installation books in its region's time (its offset when the page is
  // built or opened).
  utcOffsetMinutes: utcOffsetMinutes(REGION),
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
