import type { BusinessKind } from '@/common/api/types'

// One system colour per kind, for category tiles and banners.
const KIND_TINTS: Record<BusinessKind, string> = {
  beauty: 'var(--system-pink)',
  barber: 'var(--system-indigo)',
  nails: 'var(--system-purple)',
  spa: 'var(--system-teal)',
  health: 'var(--system-green)',
  other: 'var(--system-orange)',
}

export { KIND_TINTS }
