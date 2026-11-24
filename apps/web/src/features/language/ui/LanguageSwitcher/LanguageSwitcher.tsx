'use client'

import { Select } from '@awaisa/ui/Select'
import { useLingui } from '@lingui/react/macro'
import { LOCALE_NAMES, LOCALES, localizePath, useLocale, usePathname } from '@/shared/i18n'
import { isLocale } from '@/shared/i18n/locales'

interface LanguageSwitcherProps {
  /** `plain` in a Settings row: borderless, the value on the right. */
  variant?: 'default' | 'plain'
}

const ITEMS = LOCALES.map((locale) => ({ value: locale, label: LOCALE_NAMES[locale] }))

// Each language has its own root layout, so the switch is a full page load of the same page and
// query in the other language, not a client navigation. The query is read at the moment of the
// pick (not through `useSearchParams`), so the footer keeps cached pages static.
export const LanguageSwitcher = ({ variant = 'default' }: LanguageSwitcherProps) => {
  const { t } = useLingui()
  const locale = useLocale()
  const pathname = usePathname()

  const handleChange = (next: string | null) => {
    if (!isLocale(next) || next === locale) return
    const { search, hash } = window.location
    window.location.assign(`${localizePath(`${pathname}${search}`, next)}${hash}`)
  }

  return (
    <Select
      variant={variant}
      aria-label={t`Language`}
      items={ITEMS}
      value={locale}
      onValueChange={handleChange}
    />
  )
}
