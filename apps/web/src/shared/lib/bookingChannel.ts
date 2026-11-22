import type { BookingChannel } from '@/shared/api/types'
import { getBusinessSlug } from '@/shared/config/navigation'

const CHANNEL_KEY = 'awaisa:channel:v1'

// Discovery pages: opening one makes it the place the next booking came from.
const PAGE_CHANNELS: Record<string, BookingChannel> = {
  '/': 'catalog',
  '/feed': 'feed',
  '/map': 'map',
}

/**
 * What a page says about where a booking will come from: a discovery page names itself, a
 * place's page or booking form is the salon's link only when the session starts there (a link
 * from Instagram, 2GIS or a QR code), any other first page is `other`. Null: no change.
 */
const channelForPage = (pathname: string, isFirstPage: boolean): BookingChannel | null => {
  const page = PAGE_CHANNELS[pathname]
  if (page) return page
  if (!isFirstPage) return null
  return getBusinessSlug(pathname) ? 'salon_link' : 'other'
}

const readChannel = (): BookingChannel | undefined => {
  try {
    return (window.sessionStorage.getItem(CHANNEL_KEY) as BookingChannel | null) ?? undefined
  } catch {
    // Storage may be blocked (private mode, a WebView without it): the booking goes without.
    return undefined
  }
}

const rememberChannel = (channel: BookingChannel) => {
  try {
    window.sessionStorage.setItem(CHANNEL_KEY, channel)
  } catch {
    // Same as above.
  }
}

/** Called on every page the tab shows; the first page of the session counts differently. */
const rememberPage = (pathname: string) => {
  const channel = channelForPage(pathname, readChannel() === undefined)
  if (channel) rememberChannel(channel)
}

export { channelForPage, readChannel, rememberChannel, rememberPage }
