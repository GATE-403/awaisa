'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'

interface CatalogQueryProps {
  children: (query: URLSearchParams | null) => ReactNode
}

const ReadQuery = ({ children }: CatalogQueryProps) => children(useSearchParams())

/**
 * The catalog's query (`?kind=`, `?q=`) for the site's chrome: read only on «/», null elsewhere.
 * `useSearchParams` puts what reads it off the cached HTML of a static page until the browser
 * renders it, so chrome that needed the query only on «/» used to vanish from every cached page
 * (a place's) until scripts loaded.
 */
export const CatalogQuery = ({ children }: CatalogQueryProps) => {
  const pathname = usePathname()
  if (pathname !== '/') return children(null)

  return <ReadQuery>{children}</ReadQuery>
}
