'use client'

import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { isBookingPath } from '@/shared/config/navigation'

type PageUnderBooking = { bookingPath: string; href: string } | null

// The page a booking is open over, kept in one place for the whole app: noted when a link into
// /<slug>/book is tapped (`BookingOriginTracker`) and when a reload goes back to that page
// (`BookingReturnOnReload`). A store the chrome subscribes to: it used to live in a ref of each
// component that asked, and a component mounted while the sheet was open (the header remounts
// when its query branch changes) remembered nothing, so the header lost its category row or the
// chosen kind; a plain variable was not enough either: nothing re-rendered the header when it
// changed after a reload, and it stayed the place's header over the catalog.
let pageUnderBooking: PageUnderBooking = null
const listeners = new Set<() => void>()

/** `href` (path and query) is the page under the booking that opens at `bookingPath`. */
const setPageUnderBooking = (bookingPath: string, href: string) => {
  pageUnderBooking = { bookingPath, href }
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Path and query of the page under the booking open at `pathname`, when one is known. */
const usePageUnderBooking = (pathname: string) => {
  // The server, and hydration, know of no page under the sheet: the address is used.
  const page = useSyncExternalStore(
    subscribe,
    () => pageUnderBooking,
    () => null,
  )
  return page?.bookingPath === pathname ? page.href : null
}

/**
 * The path the site's chrome (header, tab bar, footer) follows. Booking opens over the page it was
 * tapped on (an intercepted route): while it is open the chrome keeps that page's path, so the
 * header does not lose its category row and nothing jumps under the panel. Opened directly,
 * there is no page under it and the booking path itself is used.
 */
const useChromePathname = () => {
  const pathname = usePathname()
  const pageUnder = usePageUnderBooking(pathname)
  if (!isBookingPath(pathname)) return pathname
  return pageUnder?.split('?')[0] ?? pathname
}

export { setPageUnderBooking, useChromePathname, usePageUnderBooking }
