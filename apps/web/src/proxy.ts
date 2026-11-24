import { type NextRequest, NextResponse } from 'next/server'
import { DEFAULT_LOCALE, splitLocale } from '@/shared/i18n/locales'

// Every page lives under `app/[lang]`. English is the bare address: `/map` is served by `/en/map`
// inside, and `/en/map` itself redirects to `/map`, so each page has one address per language.
// `/ru/…` and `/ky/…` go through as they are.
export const proxy = (request: NextRequest) => {
  const { pathname, search } = request.nextUrl
  if (pathname === `/${DEFAULT_LOCALE}` || pathname.startsWith(`/${DEFAULT_LOCALE}/`)) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || '/'
    return NextResponse.redirect(url, 308)
  }
  if (splitLocale(pathname).locale !== DEFAULT_LOCALE) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`
  url.search = search
  return NextResponse.rewrite(url)
}

export const config = {
  // Not the API, Next's own files, files with an extension, or the metadata routes at the root.
  matcher: [
    '/((?!api/|_next/|emoji-data/|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|icon\\.svg|apple-icon|llms\\.txt|sw\\.js|.*\\.[a-z0-9]+$).*)',
  ],
}
