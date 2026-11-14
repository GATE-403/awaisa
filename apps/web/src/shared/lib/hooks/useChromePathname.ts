'use client'

import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import { isBookingPath } from '@/shared/config/navigation'

/**
 * The path the site's chrome (header, tab bar, footer) follows. Booking opens over the page it was
 * tapped on (an intercepted route): while it is open the chrome keeps that page's path, so the
 * header does not lose its category row and nothing jumps under the panel. Opened directly,
 * there is no page under it and the booking path itself is used.
 */
export const useChromePathname = () => {
  const pathname = usePathname()
  const underlying = useRef<string | null>(null)
  if (!isBookingPath(pathname)) underlying.current = pathname
  return isBookingPath(pathname) && underlying.current ? underlying.current : pathname
}
