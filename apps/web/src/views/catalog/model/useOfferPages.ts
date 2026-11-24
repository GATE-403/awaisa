'use client'

import { useEffect, useRef, useState } from 'react'
import { listOffersPage } from '@/shared/api/clientApi'
import type { BusinessKind, Offer } from '@/shared/api/types'

// The same as the server's first page (`serverApi.listOffers`).
const PAGE_SIZE = 24

type ServerSort = 'popular' | 'price'

interface OfferPagesOptions {
  initial: Offer[]
  initialSort: ServerSort
  sort: ServerSort
  kind?: BusinessKind
  query?: string
}

// The services feed page by page: the server renders the first one, the rest load as the list
// nears its end. A new order («Cheapest») starts over from the first page in that order.
export const useOfferPages = ({ initial, initialSort, sort, kind, query }: OfferPagesOptions) => {
  const [pages, setPages] = useState({ sort: initialSort, items: initial })
  const [hasMore, setHasMore] = useState(initial.length >= PAGE_SIZE)
  const [isLoading, setIsLoading] = useState(false)
  const inFlight = useRef<AbortController | null>(null)

  const load = (order: ServerSort, offset: number) => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller
    setIsLoading(true)
    listOffersPage({ kind, q: query, offset, limit: PAGE_SIZE, sort: order }, controller.signal)
      .then((page) => {
        setPages((current) => {
          const base = offset === 0 || current.sort !== order ? [] : current.items
          const seen = new Set(base.map((item) => item.id))
          return { sort: order, items: [...base, ...page.filter((item) => !seen.has(item.id))] }
        })
        setHasMore(page.length >= PAGE_SIZE)
      })
      .catch(() => undefined)
      .finally(() => {
        if (inFlight.current === controller) {
          inFlight.current = null
          setIsLoading(false)
        }
      })
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: restart only when the order changes
  useEffect(() => {
    if (sort !== pages.sort) load(sort, 0)
  }, [sort])

  useEffect(() => () => inFlight.current?.abort(), [])

  const loadMore = () => {
    if (isLoading || !hasMore || pages.sort !== sort) return
    load(sort, pages.items.length)
  }

  return { offers: pages.items, hasMore, isLoading, loadMore }
}
