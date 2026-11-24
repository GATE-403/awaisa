'use client'

import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { CaretRight } from '@phosphor-icons/react/ssr'
import { BusinessTile, getOpeningStatus } from '@/entities/business'
import type { Business } from '@/shared/api/types'
import { Link as NextLink, usePathname } from '@/shared/i18n/navigation'
import { useRootFlag } from '@/shared/lib/hooks/useRootFlag'
import { useToday } from '@/shared/lib/hooks/useToday'
import styles from './BusinessBar.module.css'

interface BusinessBarProps {
  business: Business
}

// Apple's product local nav: you always see whose page you are on and can jump between its parts.
export const BusinessBar = ({ business }: BusinessBarProps) => {
  const { t } = useLingui()
  const pathname = usePathname()
  const today = useToday()
  const base = `/${business.slug}`
  const isBooking = pathname === `${base}/book`
  useRootFlag(isBooking ? null : 'business-bar')
  // The overview has its own big Book, so the bar does not repeat it.
  const status = today ? getOpeningStatus(business.hours, today.dayKey, today.minutes, t) : null
  const sections = [
    { href: base, label: t`Overview`, isActive: pathname === base },
    {
      href: `${base}/services`,
      label: t`Services and prices`,
      isActive: pathname === `${base}/services`,
    },
    { href: `${base}#masters`, label: t`Specialists`, isActive: false },
    { href: `${base}#visit`, label: t`Contacts`, isActive: false },
  ]

  // The booking form is its own focused screen with its own bar.
  if (isBooking) return null

  return (
    <nav
      className={styles.bar}
      data-business-bar=''
      aria-label={t`${ph({ name: business.name })} business page`}
    >
      <div className={styles.inner}>
        <div className={styles.identity}>
          <NextLink href='/' className={styles.crumb}>
            {t`Catalogue`}
          </NextLink>
          <CaretRight className={styles.separator} aria-hidden />
          <NextLink
            href={base}
            className={styles.business}
            aria-current={pathname === base ? 'page' : undefined}
          >
            <BusinessTile name={business.name} logoUrl={business.logoUrl} size='sm' />
            <span className={styles.name}>{business.name}</span>
          </NextLink>
          {status && (
            <span className={styles.status} data-open={status.isOpen || undefined}>
              {status.label}
            </span>
          )}
        </div>
        <ul className={styles.sections}>
          {sections.map((section) => (
            <li key={section.href}>
              <NextLink
                href={section.href}
                className={styles.section}
                aria-current={section.isActive ? 'page' : undefined}
              >
                {section.label}
              </NextLink>
            </li>
          ))}
        </ul>
        {!isBooking && pathname !== base && (
          <NextLink href={`${base}/book`} className={styles.cta}>
            {t`Book`}
          </NextLink>
        )}
      </div>
    </nav>
  )
}
