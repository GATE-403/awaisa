'use client'

import type { ReactNode } from 'react'
import { getBusinessSlug, isBookingPath } from '@/shared/config/navigation'
import { usePathname } from '@/shared/i18n/navigation'

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
  const isOwnAddress = isBookingPath(pathname) && getBusinessSlug(pathname) === slug
  if (!isOwnAddress) return null

  return children
}
