import type { BusinessKind } from '@/shared/api/types'

type KindSeo = { title: string; description: string }

// What people type into a search engine for each kind. «Other» has no landing of its own: it
// mixes whatever does not fit the rest, so it stays out of the index.
const KIND_SEO: Partial<Record<BusinessKind, KindSeo>> = {
  beauty: {
    title: 'Beauty salons in Bishkek: prices and online booking',
    description:
      'Haircuts, colouring, styling and make-up in Bishkek salons: prices, reviewed specialists and free times. Book online, no calls.',
  },
  barber: {
    title: 'Barbershops in Bishkek: prices and online booking',
    description:
      'Men’s haircuts, beard trims and shaves in Bishkek barbershops: prices, reviewed barbers and free times. Book online, no calls.',
  },
  nails: {
    title: 'Manicure and pedicure in Bishkek: prices and online booking',
    description:
      'Nail studios in Bishkek: manicure, pedicure and extensions, prices, reviewed specialists and free times. Book online, no calls.',
  },
  spa: {
    title: 'Spa and massage in Bishkek: prices and online booking',
    description:
      'Massage, spa and body care in Bishkek: prices, reviewed specialists and free times. Book online, no calls.',
  },
  health: {
    title: 'Dentistry and osteopathy in Bishkek: online booking',
    description:
      'Dentists, osteopaths and health specialists in Bishkek: prices, reviews and free times. Book online, no calls.',
  },
}

const INDEXED_KINDS = Object.keys(KIND_SEO) as BusinessKind[]

export { INDEXED_KINDS, KIND_SEO }
