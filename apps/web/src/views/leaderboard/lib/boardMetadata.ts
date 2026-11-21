import type { Metadata } from 'next'
import type { BusinessKind } from '@/shared/api/types'
import { BASE_OPEN_GRAPH, PLATFORM_OG_IMAGE } from '@/shared/lib/seo/businessMetadata'
import { BOARDS, type BoardView, boardHref, DEFAULT_BOARD_KIND } from '../config/boards'

type BoardParams = Record<string, string | string[] | undefined>

const readBoard = (params: BoardParams): { kind: BusinessKind; view: BoardView } => ({
  kind: BOARDS.find((board) => board.kind === params.kind)?.kind ?? DEFAULT_BOARD_KIND,
  view: params.view === 'places' ? 'places' : 'masters',
})

/** Each board (kind × masters or places) is a page of its own, with its own canonical. */
const boardMetadata = (params: BoardParams): Metadata => {
  const { kind, view } = readBoard(params)
  const board = BOARDS.find((item) => item.kind === kind) ?? BOARDS[0]
  const heading = view === 'places' ? board.places : board.masters
  const title = `${heading} Бишкека: рейтинг по отзывам`
  const description = `${heading} Бишкека по отзывам клиентов: оценки, число отзывов и запись онлайн без звонков.`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: boardHref(view, kind) },
    openGraph: {
      ...BASE_OPEN_GRAPH,
      title,
      description,
      url: boardHref(view, kind),
      images: [PLATFORM_OG_IMAGE],
    },
  }
}

export { boardMetadata, readBoard }
