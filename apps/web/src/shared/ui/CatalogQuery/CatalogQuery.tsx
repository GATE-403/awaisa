'use client'

import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { usePathname } from '@/shared/i18n/navigation'
import { useChromePathname, usePageUnderBooking } from '@/shared/lib/hooks/useChromePathname'

interface CatalogQueryProps {
  children: (query: URLSearchParams | null) => ReactNode
}

// Under an open booking the address carries the form's query (`?service=`), not the catalog's:
// the catalog's own query comes from the page noted under the sheet.
const ReadQuery = ({ children }: CatalogQueryProps) => {
  const pathname = usePathname()
  const params = useSearchParams()
  const pageUnder = usePageUnderBooking(pathname)
  if (pageUnder === null) return children(params)
  return children(new URLSearchParams(pageUnder.split('?')[1] ?? ''))
}

/**
 * The catalog's query (`?kind=`, `?q=`) for the site's chrome: read only on «/», null elsewhere.
 * `useSearchParams` puts what reads it off the cached HTML of a static page until the browser
 * renders it, so chrome that needed the query only on «/» used to vanish from every cached page
 * (a place's) until scripts loaded.
 */
// The chrome's path, not the address: a booking opened over the catalog used to switch this to the
// other branch, which mounted the header anew, and the new header, with no page under the sheet
// to remember, dropped its category row, and the catalog jumped up by the row's height.
export const CatalogQuery = ({ children }: CatalogQueryProps) => {
  const pathname = useChromePathname()
  if (pathname !== '/') return children(null)

  return <ReadQuery>{children}</ReadQuery>
}
