import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { BusinessKind } from '@/shared/api/types'

type BoardView = 'masters' | 'places'

// What each board is called, in the order of the tabs.
const BOARDS: {
  kind: BusinessKind
  tab: MessageDescriptor
  masters: MessageDescriptor
  places: MessageDescriptor
}[] = [
  { kind: 'barber', tab: msg`Barbers`, masters: msg`Top barbers`, places: msg`Top barbershops` },
  { kind: 'beauty', tab: msg`Stylists`, masters: msg`Top stylists`, places: msg`Top salons` },
  {
    kind: 'nails',
    tab: msg`Nails`,
    masters: msg`Top manicurists`,
    places: msg`Top nail studios`,
  },
  { kind: 'spa', tab: msg`Massage`, masters: msg`Top massage therapists`, places: msg`Top SPAs` },
  { kind: 'health', tab: msg`Health`, masters: msg`Top specialists`, places: msg`Top clinics` },
  {
    kind: 'other',
    tab: msg`Tattoo`,
    masters: msg`Top tattoo artists`,
    places: msg`Top tattoo studios`,
  },
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
