import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { notFound } from 'next/navigation'
import { API_URL } from '@/shared/config/api'
import { BUSINESSES_TAG, businessTag } from './cacheTags'
import { API_TIMEOUT_MS, readApi } from './readApi'
import type {
  BusinessCard,
  BusinessKind,
  BusinessPage,
  CertificateSale,
  FeedPage,
  FiscalReceipt,
  LeaderboardMaster,
  LeaderboardPlace,
  MapPlace,
  Offer,
  OnlineSubscriptionPlan,
  PaymentPage,
  PopularService,
  PublicPromotion,
  QuestionList,
  ReviewSummary,
  SearchCorrection,
} from './types'

// Public data is cached on the server (Cache Components): pages render from cache for minutes and
// owners' edits refresh their business at once through updateTag (see revalidate.ts). Reads go
// through readApi: with the API down, a page is drawn from the last good answer, cached for
// seconds only (`isStale`) so it heals as soon as the API is back.
const fetchBusiness = async (slug: string): Promise<BusinessPage | null> => {
  'use cache'
  cacheTag(BUSINESSES_TAG, businessTag(slug))

  const { data, isStale } = await readApi<BusinessPage | null>(
    `/businesses/${encodeURIComponent(slug)}`,
    { isNullOnNotFound: true },
  )
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
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
  cacheTag(BUSINESSES_TAG)

  const params = new URLSearchParams()
  if (kind) params.set('kind', kind)
  if (query) params.set('q', query)
  const { data, isStale } = await readApi<BusinessCard[]>(`/businesses?${params}`)
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

// Every published place for the sitemap: the list answers 60 a page at most.
const SITEMAP_PAGE_SIZE = 60
const SITEMAP_MAX_PAGES = 50

const listAllBusinesses = async (): Promise<BusinessCard[]> => {
  'use cache'
  cacheTag(BUSINESSES_TAG)

  const all: BusinessCard[] = []
  let hasStale = false
  for (let page = 0; page < SITEMAP_MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      offset: String(page * SITEMAP_PAGE_SIZE),
      limit: String(SITEMAP_PAGE_SIZE),
    })
    const { data, isStale } = await readApi<BusinessCard[]>(`/businesses?${params}`)
    hasStale ||= isStale
    all.push(...data)
    if (data.length < SITEMAP_PAGE_SIZE) break
  }
  if (hasStale) cacheLife('seconds')
  else cacheLife('hours')
  return all
}

const listPopularServices = async (kind: BusinessKind | undefined): Promise<PopularService[]> => {
  'use cache'
  cacheTag(BUSINESSES_TAG)

  const params = new URLSearchParams(kind ? { kind } : {})
  const { data, isStale } = await readApi<PopularService[]>(
    `/businesses/popular-services?${params}`,
  )
  if (isStale) cacheLife('seconds')
  else cacheLife('hours')
  return data
}

// The first page of the services feed; the rest loads on the client as the list nears its end.
const OFFERS_PAGE_SIZE = 24 // the same as `views/catalog/model/useOfferPages`

const listOffers = async (
  kind: BusinessKind | undefined,
  query: string | undefined,
  sort: 'popular' | 'price' = 'popular',
): Promise<Offer[]> => {
  'use cache'
  cacheTag(BUSINESSES_TAG)

  const params = new URLSearchParams({ limit: String(OFFERS_PAGE_SIZE), sort })
  if (kind) params.set('kind', kind)
  if (query) params.set('q', query)
  const { data, isStale } = await readApi<Offer[]>(`/businesses/offers?${params}`)
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

// Refreshed with the business: a new review calls refreshBusiness(slug).
const listReviews = async (slug: string): Promise<ReviewSummary> => {
  'use cache'
  cacheTag(businessTag(slug))

  const { data, isStale } = await readApi<ReviewSummary>(
    `/businesses/${encodeURIComponent(slug)}/reviews?limit=20`,
    {
      fallback: { count: 0, average: 0, distribution: [], items: [] },
    },
  )
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

// Answered questions; an owner's answer calls refreshBusiness(slug).
const listQuestions = async (slug: string): Promise<QuestionList> => {
  'use cache'
  cacheTag(businessTag(slug))

  const { data, isStale } = await readApi<QuestionList>(
    `/businesses/${encodeURIComponent(slug)}/questions`,
    {
      fallback: { count: 0, items: [] },
    },
  )
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

// What a search was read as («cnhb;rf» → «стрижка»), for «Показаны результаты для …».
const resolveSearch = async (query: string): Promise<SearchCorrection> => {
  'use cache'
  cacheTag(BUSINESSES_TAG)

  const { data, isStale } = await readApi<SearchCorrection>(
    `/search/resolve?${new URLSearchParams({ q: query })}`,
    {
      fallback: { query, corrected: null },
    },
  )
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

// The masters' leaderboard for a kind: the same for everyone, refreshed with the catalog.
const listLeaderboard = async (kind: BusinessKind): Promise<LeaderboardMaster[]> => {
  'use cache'
  cacheTag(BUSINESSES_TAG)

  const { data, isStale } = await readApi<LeaderboardMaster[]>(
    `/rankings/masters?kind=${kind}&limit=50`,
  )
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

const listPlacesLeaderboard = async (kind: BusinessKind): Promise<LeaderboardPlace[]> => {
  'use cache'
  cacheTag(BUSINESSES_TAG)

  const { data, isStale } = await readApi<LeaderboardPlace[]>(
    `/rankings/places?kind=${kind}&limit=50`,
  )
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

// «Похожие места» of a place, ranked by the API (distance, menu, price level, rating); the page
// renders without them.
const listSimilarPlaces = async (slug: string): Promise<BusinessCard[]> => {
  'use cache'
  cacheTag(BUSINESSES_TAG, businessTag(slug))

  const { data, isStale } = await readApi<BusinessCard[]>(
    `/businesses/${encodeURIComponent(slug)}/similar`,
    { fallback: [] },
  )
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

// The map's first list (no location yet): the same for everyone, so it is cached like the catalog.
const listMapPlaces = async (kind: BusinessKind | undefined): Promise<MapPlace[]> => {
  'use cache'
  cacheTag(BUSINESSES_TAG)

  const params = new URLSearchParams(kind ? { kind } : {})
  const { data, isStale } = await readApi<MapPlace[]>(`/map?${params}`)
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

// The pay page reads its payment by the signed link: never cached, it changes as the client pays.
const getPaymentPage = async (id: string, signature: string): Promise<PaymentPage | null> => {
  const response = await fetch(
    `${API_URL}/payments/${encodeURIComponent(id)}?${new URLSearchParams({ s: signature })}`,
    { cache: 'no-store', signal: AbortSignal.timeout(API_TIMEOUT_MS) },
  ).catch(() => null)
  if (!response?.ok) return null

  return response.json()
}

// Subscriptions sold online on the business page; refreshed with the business when the owner saves.
const listSubscriptionPlans = async (slug: string): Promise<OnlineSubscriptionPlan[]> => {
  'use cache'
  cacheTag(businessTag(slug))

  const { data, isStale } = await readApi<OnlineSubscriptionPlan[]>(
    `/businesses/${encodeURIComponent(slug)}/subscription-plans`,
    { fallback: [] },
  )
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

// A fiscal receipt by the client's signed link; never cached (it changes while it is sent).
const getReceiptPage = async (id: string, signature: string): Promise<FiscalReceipt | null> => {
  const response = await fetch(
    `${API_URL}/fiscal/receipts/${encodeURIComponent(id)}?${new URLSearchParams({ s: signature })}`,
    { cache: 'no-store', signal: AbortSignal.timeout(API_TIMEOUT_MS) },
  ).catch(() => null)
  if (!response?.ok) return null

  return response.json()
}

// Open promotions for the business page; refreshed with the business when the owner saves.
const listPromotions = async (slug: string): Promise<PublicPromotion[]> => {
  'use cache'
  cacheTag(businessTag(slug))

  const { data, isStale } = await readApi<PublicPromotion[]>(
    `/businesses/${encodeURIComponent(slug)}/promotions`,
    {
      fallback: [],
    },
  )
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

// «Подарочный сертификат» on the business page: the amounts on sale, or null when it sells none.
const getCertificateSale = async (slug: string): Promise<CertificateSale> => {
  'use cache'
  cacheTag(businessTag(slug))

  const { data, isStale } = await readApi<CertificateSale>(
    `/businesses/${encodeURIComponent(slug)}/certificate-sale`,
    { fallback: null },
  )
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
}

// The first page of «Работы»; the feed loads the rest on the client as it scrolls.
const listFeed = async (
  kind: BusinessKind | undefined,
  business: string | undefined,
  start: string | undefined,
  offset = 0,
): Promise<FeedPage> => {
  'use cache'
  cacheTag(BUSINESSES_TAG)

  const params = new URLSearchParams()
  if (kind) params.set('kind', kind)
  if (business) params.set('business', business)
  if (start) params.set('start', start)
  if (offset) params.set('offset', String(offset))
  const { data, isStale } = await readApi<FeedPage>(`/feed?${params}`)
  if (isStale) cacheLife('seconds')
  else cacheLife('minutes')
  return data
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
  fetchBusiness as findBusiness,
  listAllBusinesses,
  listLeaderboard,
  listPlacesLeaderboard,
  listServicePhotos,
  listSimilarPlaces,
  listFeed,
  listPromotions,
  getCertificateSale,
  listSubscriptionPlans,
  getPaymentPage,
  getReceiptPage,
  listMapPlaces,
  getBusiness,
  listBusinesses,
  listOffers,
  listPopularServices,
  listQuestions,
  listReviews,
  resolveSearch,
}
