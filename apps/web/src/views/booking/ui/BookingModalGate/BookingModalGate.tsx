'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { isBookingPath } from '../../lib/bookingPath'

interface BookingModalGateProps {
  slug: string
  children: ReactNode
}

// The booking opened over a page lives in the `@modal` slot. On a soft navigation to a path the
// slot has no page for, Next keeps the slot as it was, so the sheet would stay open over the next
// page. A catch-all page in the slot used to close it, but its param became a param of every page
// (`/<slug>` among them) and kept those pages from being cached whole; the sheet now shows only
// while the address is its own.
export const BookingModalGate = ({ slug, children }: BookingModalGateProps) => {
  const pathname = usePathname()
  if (!isBookingPath(pathname, slug)) return null

  return children
}
