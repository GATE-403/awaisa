import { utcOffsetMinutes } from '@awaisa/region'
import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { BusinessKind } from '@/shared/api/types'
import { REGION } from '@/shared/config/region'

const PLATFORM = {
  name: 'Awaisa',
  // English, for files that cannot know the language (the web manifest); pages show `SITE_TAGLINE`
  // from `shared/lib/seo` in theirs.
  tagline: 'Online booking with salons and specialists: no calls.',
  // Every business of the installation books in its region's time (its offset when the page is
  // built or opened).
  utcOffsetMinutes: utcOffsetMinutes(REGION),
}

const OTHER_KIND_LABEL = msg`Other`

// Labels are descriptors: show them with `t(kind.label)`.
const BUSINESS_KINDS: { value: BusinessKind; label: MessageDescriptor }[] = [
  { value: 'beauty', label: msg`Beauty salons` },
  { value: 'barber', label: msg`Barbershops` },
  { value: 'nails', label: msg`Nail studios` },
  { value: 'spa', label: msg`SPA and massage` },
  { value: 'health', label: msg`Health` },
  { value: 'other', label: OTHER_KIND_LABEL },
]

const getKindLabel = (kind: BusinessKind): MessageDescriptor =>
  BUSINESS_KINDS.find((item) => item.value === kind)?.label ?? OTHER_KIND_LABEL

export { BUSINESS_KINDS, getKindLabel, PLATFORM }
