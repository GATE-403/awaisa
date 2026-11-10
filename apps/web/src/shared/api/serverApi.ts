import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { notFound } from 'next/navigation'
import { API_URL } from '@/shared/config/api'
import { toApiError } from './apiError'
import { BUSINESSES_TAG, businessTag } from './cacheTags'
import type {
  BusinessCard,
  BusinessKind,
  BusinessPage,
  Offer,
  PopularService,
  ReviewSummary,
} from './types'

const NOT_FOUND = 404

// Public data is cached on the server (Cache Components): pages render from cache for minutes and
// owners' edits refresh their business at once through updateTag (see revalidate.ts).
const fetchBusiness = async (slug: string): Promise<BusinessPage | null> => {
  'use cache'
  cacheLife('minutes')
  cacheTag(BUSINESSES_TAG, businessTag(slug))

  const response = await fetch(`${API_URL}/businesses/${encodeURIComponent(slug)}`)
  if (response.status === NOT_FOUND) return null
  if (!response.ok) throw await toApiError(response)

  return response.json()
}

const getBusiness = async (slug: string): Promise<BusinessPage> => {
  const page = await fetchBusiness(slug)
  if (!page) notFound()

  return page
}

const listBusinesses = async (
  kind: BusinessKind | undefined,
  query: string | undefined,
): Promise<BusinessCard[]> => {
  'use cache'
  cacheLife('minutes')
  cacheTag(BUSINESSES_TAG)

  const params = new URLSearchParams()
  if (kind) params.set('kind', kind)
  if (query) params.set('q', query)
  const response = await fetch(`${API_URL}/businesses?${params}`)
  if (!response.ok) throw await toApiError(response)

  return response.json()
}

const listPopularServices = async (kind: BusinessKind | undefined): Promise<PopularService[]> => {
  'use cache'
  cacheLife('hours')
  cacheTag(BUSINESSES_TAG)

  const params = new URLSearchParams(kind ? { kind } : {})
  const response = await fetch(`${API_URL}/businesses/popular-services?${params}`)
  if (!response.ok) throw await toApiError(response)

  return response.json()
}

const listOffers = async (
  kind: BusinessKind | undefined,
  query: string | undefined,
): Promise<Offer[]> => {
  'use cache'
  cacheLife('minutes')
  cacheTag(BUSINESSES_TAG)

  const params = new URLSearchParams()
  if (kind) params.set('kind', kind)
  if (query) params.set('q', query)
  const response = await fetch(`${API_URL}/businesses/offers?${params}`)
  if (!response.ok) throw await toApiError(response)

  return response.json()
}

// Refreshed with the business: a new review calls refreshBusiness(slug).
const listReviews = async (slug: string): Promise<ReviewSummary> => {
  'use cache'
  cacheLife('minutes')
  cacheTag(businessTag(slug))

  const response = await fetch(`${API_URL}/businesses/${encodeURIComponent(slug)}/reviews?limit=6`)
  if (!response.ok) return { count: 0, average: 0, distribution: [], items: [] }

  return response.json()
}

export { getBusiness, listBusinesses, listOffers, listPopularServices, listReviews }
