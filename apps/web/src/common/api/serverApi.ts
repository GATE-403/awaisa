import 'server-only'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { API_URL } from '@/config/api'
import { toApiError } from './apiError'
import type { BusinessCard, BusinessKind, BusinessPage, PopularService } from './types'

const NOT_FOUND = 404

const getBusiness = cache(async (slug: string): Promise<BusinessPage> => {
  const response = await fetch(`${API_URL}/businesses/${encodeURIComponent(slug)}`)
  if (response.status === NOT_FOUND) notFound()
  if (!response.ok) throw await toApiError(response)

  return response.json()
})

const listBusinesses = cache(
  async (kind: BusinessKind | undefined, query: string | undefined): Promise<BusinessCard[]> => {
    const params = new URLSearchParams()
    if (kind) params.set('kind', kind)
    if (query) params.set('q', query)
    const response = await fetch(`${API_URL}/businesses?${params}`)
    if (!response.ok) throw await toApiError(response)

    return response.json()
  },
)

const listPopularServices = cache(
  async (kind: BusinessKind | undefined): Promise<PopularService[]> => {
    const params = new URLSearchParams(kind ? { kind } : {})
    const response = await fetch(`${API_URL}/businesses/popular-services?${params}`)
    if (!response.ok) throw await toApiError(response)

    return response.json()
  },
)

export { getBusiness, listBusinesses, listPopularServices }
