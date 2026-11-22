'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { getBusinessSlug, isBookingPath } from '@/shared/config/navigation'
import { setPageUnderBooking } from '@/shared/lib/hooks/useChromePathname'
import {
  clearBookingOrigin,
  RETURNING_BOOT_SCRIPT,
  readBookingOrigin,
  saveBookingOrigin,
  shouldReturnToOrigin,
  stopReturning,
} from '../../lib/bookingOrigin'
import { noteSheetAlreadyUp } from '../../lib/sheetHandoff'

// Root layout: notes the page a booking is opened over. One listener for every way in («Записаться»
// on a card, «Для вас», «Снова к мастеру», «Продолжить запись»…) instead of a hook in each link.
export const BookingOriginTracker = () => {
  useEffect(() => {
    const remember = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(link instanceof HTMLAnchorElement) || isBookingPath(window.location.pathname)) return
      const url = new URL(link.href)
      if (url.origin !== window.location.origin || !isBookingPath(url.pathname)) return
      const slug = getBusinessSlug(url.pathname)
      if (!slug) return
      const from = `${window.location.pathname}${window.location.search}`
      saveBookingOrigin({ slug, from })
      // The chrome keeps following this page while the sheet is over it.
      setPageUnderBooking(url.pathname, from)
    }
    document.addEventListener('click', remember, { capture: true })
    return () => document.removeEventListener('click', remember, { capture: true })
  }, [])

  return null
}

// Once per page load: Strict Mode runs effects twice, and two steps back would leave the site.
// Set when the step back is taken, not when it is planned: the first run's cleanup cancels it.
let hasChecked = false
// The step back has been taken and the place's page is hidden until the page under it is back.
let isGoingBack = false

// The full /<slug>/book route: a reload of a booking opened over the catalog used to land on the
// place's page under the sheet. The page it was opened over is still the entry before this one,
// so step back to it and open the booking over it again, as before the reload.
export const BookingReturnOnReload = () => {
  const router = useRouter()

  useEffect(() => {
    if (hasChecked) return
    const navigation = performance.getEntriesByType('navigation')[0]
    const isReload =
      navigation instanceof PerformanceNavigationTiming && navigation.type === 'reload'
    const slug = getBusinessSlug(window.location.pathname)
    const origin = readBookingOrigin()
    if (!shouldReturnToOrigin(origin, slug, isReload) || window.history.length < 2) {
      hasChecked = true
      clearBookingOrigin()
      stopReturning()
      return
    }
    const bookingPath = window.location.pathname
    const href = `${bookingPath}${window.location.search}`
    // The chrome follows the page under the sheet from now on, whichever render shows it first.
    setPageUnderBooking(bookingPath, origin.from)
    const reopen = () => {
      // The sheet was on screen before the reload: it comes back in place, without rising again.
      noteSheetAlreadyUp()
      router.push(href, { scroll: false })
      // Should the page never come back (an error), the place shows again after a while.
      window.setTimeout(stopReturning, 10_000)
    }
    // A task later on both ends: this effect runs before the app router's own (children first),
    // which is where Next starts listening for «back»; and once back, Next handles the step in its
    // own listener first, so the booking opens after it, not under it. Run at once, a step back
    // could slip past Next under load and the place's sheet stayed beside the new one.
    const goBack = window.setTimeout(() => {
      hasChecked = true
      isGoingBack = true
      window.addEventListener('popstate', () => window.setTimeout(reopen, 0), { once: true })
      window.history.back()
    }, 0)
    return () => window.clearTimeout(goBack)
  }, [router])

  // The mark (the place hidden, the catalog's skeleton shown) goes when the page under the sheet
  // is really back: Activity hides this route then and runs this cleanup. On a timer it went
  // before a slow catalog arrived, and the screen under the header was empty.
  useEffect(
    () => () => {
      if (!isGoingBack) return
      isGoingBack = false
      stopReturning()
    },
    [],
  )

  return (
    <div
      hidden
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: a static script of ours, no user input
      dangerouslySetInnerHTML={{ __html: `<script>${RETURNING_BOOT_SCRIPT}</script>` }}
    />
  )
}
