import type { BusinessKind } from '@/shared/api/types'

type BoardView = 'masters' | 'places'

// What each board is called, in the order of the tabs.
const BOARDS: { kind: BusinessKind; tab: string; masters: string; places: string }[] = [
  { kind: 'barber', tab: 'Barbers', masters: 'Top barbers', places: 'Top barbershops' },
  { kind: 'beauty', tab: 'Stylists', masters: 'Top stylists', places: 'Top salons' },
  {
    kind: 'nails',
    tab: 'Nails',
    masters: 'Top manicurists',
    places: 'Top nail studios',
  },
  { kind: 'spa', tab: 'Massage', masters: 'Top massage therapists', places: 'Top SPAs' },
  { kind: 'health', tab: 'Health', masters: 'Top specialists', places: 'Top clinics' },
  { kind: 'other', tab: 'Tattoo', masters: 'Top tattoo artists', places: 'Top tattoo studios' },
]

const DEFAULT_BOARD_KIND: BusinessKind = 'barber'

const boardHref = (view: BoardView, kind: BusinessKind) => {
  const params = new URLSearchParams()
  if (view === 'places') params.set('view', 'places')
  if (kind !== DEFAULT_BOARD_KIND) params.set('kind', kind)
  const query = params.toString()
  return query ? `/top?${query}` : '/top'
}

export type { BoardView }
export { BOARDS, boardHref, DEFAULT_BOARD_KIND }
