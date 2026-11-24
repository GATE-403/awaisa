import { type NextRequest, NextResponse } from 'next/server'
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  localizePath,
  pickLocale,
  splitLocale,
} from '@/shared/i18n/locales'

// Every page lives under `app/[lang]`. English is the bare address: `/map` is served by `/en/map`
// inside, and `/en/map` itself redirects to `/map`, so each page has one address per language.
// `/ru/…` and `/ky/…` go through as they are.

// Opening a page in the browser, not the app router's own requests for a page's data (`RSC: 1`,
// prefetches): those follow the address the page already has.
const isPageOpen = (request: NextRequest) =>
  request.method === 'GET' &&
  request.headers.get('rsc') === null &&
  (request.headers.get('accept') ?? '').includes('text/html')

// The language for a bare address: the one picked in the switcher, else the browser's own (Bluesky
// starts in the device's language too). Most people here read Russian or Kyrgyz.
const preferredLocale = (request: NextRequest) => {
  const picked = request.cookies.get(LOCALE_COOKIE)?.value
  return isLocale(picked) ? picked : pickLocale(request.headers.get('accept-language'))
}

export const proxy = (request: NextRequest) => {
  const { pathname, search } = request.nextUrl
  if (pathname === `/${DEFAULT_LOCALE}` || pathname.startsWith(`/${DEFAULT_LOCALE}/`)) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || '/'
    return NextResponse.redirect(url, 308)
  }
  if (splitLocale(pathname).locale !== DEFAULT_LOCALE) return NextResponse.next()
  if (isPageOpen(request)) {
    const locale = preferredLocale(request)
    if (locale !== DEFAULT_LOCALE) {
      const url = request.nextUrl.clone()
      url.pathname = localizePath(pathname, locale)
      // Temporary: the same address answers in English to someone who picked English.
      return NextResponse.redirect(url, 307)
    }
  }
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
