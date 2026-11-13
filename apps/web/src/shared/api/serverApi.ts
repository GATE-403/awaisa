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
  FeedPage,
  MapPlace,
  Offer,
  PaymentPage,
  PopularService,
  PublicPromotion,
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

// The first page of the services feed; the rest loads on the client as the list nears its end.
const OFFERS_PAGE_SIZE = 24 // the same as `views/catalog/model/useOfferPages`

const listOffers = async (
  kind: BusinessKind | undefined,
  query: string | undefined,
  sort: 'popular' | 'price' = 'popular',
): Promise<Offer[]> => {
  'use cache'
  cacheLife('minutes')
  cacheTag(BUSINESSES_TAG)

  const params = new URLSearchParams({ limit: String(OFFERS_PAGE_SIZE), sort })
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

  const response = await fetch(`${API_URL}/businesses/${encodeURIComponent(slug)}/reviews?limit=20`)
  if (!response.ok) return { count: 0, average: 0, distribution: [], items: [] }

  return response.json()
}

// The map's first list (no location yet): the same for everyone, so it is cached like the catalog.
const listMapPlaces = async (kind: BusinessKind | undefined): Promise<MapPlace[]> => {
  'use cache'
  cacheLife('minutes')
  cacheTag(BUSINESSES_TAG)

  const params = new URLSearchParams(kind ? { kind } : {})
  const response = await fetch(`${API_URL}/map?${params}`)
  if (!response.ok) throw await toApiError(response)

  return response.json()
}

// The pay page reads its payment by the signed link: never cached, it changes as the client pays.
const getPaymentPage = async (id: string, signature: string): Promise<PaymentPage | null> => {
  const response = await fetch(
    `${API_URL}/payments/${encodeURIComponent(id)}?${new URLSearchParams({ s: signature })}`,
    { cache: 'no-store' },
  )
  if (!response.ok) return null

  return response.json()
}

// Open promotions for the business page; refreshed with the business when the owner saves.
const listPromotions = async (slug: string): Promise<PublicPromotion[]> => {
  'use cache'
  cacheLife('minutes')
  cacheTag(businessTag(slug))

  const response = await fetch(`${API_URL}/businesses/${encodeURIComponent(slug)}/promotions`)
  if (!response.ok) return []

  return response.json()
}

// The first page of «Работы»; the feed loads the rest on the client as it scrolls.
const listFeed = async (
  kind: BusinessKind | undefined,
  business: string | undefined,
  start: string | undefined,
): Promise<FeedPage> => {
  'use cache'
  cacheLife('minutes')
  cacheTag(BUSINESSES_TAG)

  const params = new URLSearchParams()
  if (kind) params.set('kind', kind)
  if (business) params.set('business', business)
  if (start) params.set('start', start)
  const response = await fetch(`${API_URL}/feed?${params}`)
  if (!response.ok) throw await toApiError(response)

  return response.json()
}

// A tagged work photo per service (the newest wins), for the place's service cards.
const listServicePhotos = async (slug: string): Promise<Record<string, string>> => {
  const page = await listFeed(undefined, slug, undefined).catch(() => null)
  const photos: Record<string, string> = {}
  for (const item of page?.items ?? []) {
    if (item.service && !photos[item.service.id]) photos[item.service.id] = item.url
  }
  return photos
}

export {
  listServicePhotos,
  listFeed,
  listPromotions,
  getPaymentPage,
  listMapPlaces,
  getBusiness,
  listBusinesses,
  listOffers,
  listPopularServices,
  listReviews,
}
