import type { Icon } from '@phosphor-icons/react'
import {
  FirstAidKit,
  Flower,
  HandPalm,
  Scissors,
  Sparkle,
  SquaresFour,
  Storefront,
} from '@phosphor-icons/react/ssr'
import type { BusinessKind } from '@/shared/api/types'

// One system colour per kind, for category tiles and banners.
const KIND_TINTS: Record<BusinessKind, string> = {
  beauty: 'var(--system-pink)',
  barber: 'var(--system-indigo)',
  nails: 'var(--system-purple)',
  spa: 'var(--system-teal)',
  health: 'var(--system-green)',
  other: 'var(--system-orange)',
}

// Category glyphs for the catalog's category row (UI icons, not decoration).
const KIND_ICONS: Record<BusinessKind | 'all', Icon> = {
  all: SquaresFour,
  beauty: Sparkle,
  barber: Scissors,
  nails: HandPalm,
  spa: Flower,
  health: FirstAidKit,
  other: Storefront,
}

export { KIND_ICONS, KIND_TINTS }
