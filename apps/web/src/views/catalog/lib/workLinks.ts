import type { BusinessKind, FeedItem } from '@/shared/api/types'

type WorkLinkItem = Pick<FeedItem, 'id' | 'business' | 'service' | 'specialist'>

/** «Образы» opened on this work, within the catalog's kind. */
const workFeedHref = (item: Pick<FeedItem, 'id'>, kind: BusinessKind | undefined) => {
  const params = new URLSearchParams({ start: item.id })
  if (kind) params.set('kind', kind)
  return `/feed?${params}`
}

/** «Хочу так»: this service with this master, the photo going along as the look wanted. */
const workLookHref = (item: WorkLinkItem) => {
  const params = new URLSearchParams()
  if (item.service) params.set('service', item.service.id)
  if (item.specialist) params.set('specialist', item.specialist.id)
  params.set('look', item.id)
  return `/${item.business.slug}/book?${params}`
}

export { workFeedHref, workLookHref }
