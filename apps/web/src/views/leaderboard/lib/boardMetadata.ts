import type { I18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import type { BusinessKind } from '@/shared/api/types'
import { baseOpenGraph, PLATFORM_OG_IMAGE } from '@/shared/lib/seo/businessMetadata'
import { say } from '@/shared/lib/seo/seoText'
import { BOARDS, type BoardView, boardHref, DEFAULT_BOARD_KIND } from '../config/boards'

type BoardParams = Record<string, string | string[] | undefined>

const readBoard = (params: BoardParams): { kind: BusinessKind; view: BoardView } => ({
  kind: BOARDS.find((board) => board.kind === params.kind)?.kind ?? DEFAULT_BOARD_KIND,
  view: params.view === 'places' ? 'places' : 'masters',
})

/** Each board (kind × masters or places) is a page of its own, with its own canonical. */
const boardMetadata = (params: BoardParams, i18n: I18n): Metadata => {
  const { kind, view } = readBoard(params)
  const board = BOARDS.find((item) => item.kind === kind) ?? BOARDS[0]
  const heading = say(i18n, view === 'places' ? board.places : board.masters)
  const title = i18n._(msg`${heading} in Bishkek: ranked by reviews`)
  const description = i18n._(
    msg`${heading} in Bishkek by client reviews: ratings, review counts and online booking with no calls.`,
  )

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: boardHref(view, kind) },
    openGraph: {
      ...baseOpenGraph(i18n),
      title,
      description,
      url: boardHref(view, kind),
      images: [PLATFORM_OG_IMAGE],
    },
  }
}

export { boardMetadata, readBoard }
