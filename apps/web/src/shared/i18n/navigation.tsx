'use client'

import { useLingui } from '@lingui/react'
import NextLink from 'next/link'
import { usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation'
import { type ComponentProps, useMemo } from 'react'
import { DEFAULT_LOCALE, isLocale, type Locale, localizePath, splitLocale } from './locales'

// The app's code speaks in bare paths (`/map`, `/u/1`); these wrappers put the page's language in
// front when it navigates and take it off when it reads the address, so nothing else needs to know.

const useLocale = (): Locale => {
  const { i18n } = useLingui()
  return isLocale(i18n.locale) ? i18n.locale : DEFAULT_LOCALE
}

type Href = ComponentProps<typeof NextLink>['href']

const localizeHref = (href: Href, locale: Locale): Href => {
  if (typeof href === 'string') return localizePath(href, locale)
  if (!href.pathname) return href
  return { ...href, pathname: localizePath(href.pathname, locale) }
}

/** `next/link` in the page's language. */
const Link = ({ href, ...props }: ComponentProps<typeof NextLink>) => {
  const locale = useLocale()
  return <NextLink href={localizeHref(href, locale)} {...props} />
}

/** `useRouter()` whose push, replace and prefetch take bare paths. */
const useRouter = () => {
  const router = useNextRouter()
  const locale = useLocale()
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) =>
        router.push(localizePath(href, locale), options),
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) =>
        router.replace(localizePath(href, locale), options),
      prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) =>
        router.prefetch(localizePath(href, locale), options),
    }),
    [router, locale],
  )
}

/** The address without its language: `/ru/map` reads as `/map`. */
const usePathname = () => {
  const pathname = useNextPathname()
  return splitLocale(pathname).path
}

export { Link, localizeHref, useLocale, usePathname, useRouter }
