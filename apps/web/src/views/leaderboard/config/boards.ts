import type { BusinessKind } from '@/shared/api/types'

type BoardView = 'masters' | 'places'

// What each board is called, in the order of the tabs.
const BOARDS: { kind: BusinessKind; tab: string; masters: string; places: string }[] = [
  { kind: 'barber', tab: 'Барберы', masters: 'Лучшие барберы', places: 'Лучшие барбершопы' },
  { kind: 'beauty', tab: 'Стилисты', masters: 'Лучшие стилисты', places: 'Лучшие салоны' },
  {
    kind: 'nails',
    tab: 'Ногти',
    masters: 'Лучшие мастера маникюра',
    places: 'Лучшие ногтевые студии',
  },
  { kind: 'spa', tab: 'Массаж', masters: 'Лучшие массажисты', places: 'Лучшие SPA' },
  { kind: 'health', tab: 'Здоровье', masters: 'Лучшие специалисты', places: 'Лучшие клиники' },
  { kind: 'other', tab: 'Тату', masters: 'Лучшие тату-мастера', places: 'Лучшие тату-студии' },
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
