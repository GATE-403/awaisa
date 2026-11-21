'use client'

import { useEffect, useState } from 'react'
import { getClients } from '@/shared/api/clientApi'
import type { ClientListItem } from '@/shared/api/types'

const SEARCH_DELAY_MS = 250
const LIMIT = 4

/**
 * Clients of this business matching what is being typed: two letters of a name or three digits
 * of a number (after +996). Nothing while the query is shorter, or once it is exactly one client.
 */
export const useClientSuggestions = (slug: string, query: string) => {
  const [clients, setClients] = useState<ClientListItem[]>([])

  useEffect(() => {
    if (!query) {
      setClients([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      getClients(
        slug,
        { q: query, segment: 'all', sort: 'recent', limit: LIMIT },
        controller.signal,
      )
        .then((list) => setClients(list.items))
        // Suggestions are a convenience: the fields work without them.
        .catch(() => undefined)
    }, SEARCH_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [slug, query])

  return query ? clients : []
}
