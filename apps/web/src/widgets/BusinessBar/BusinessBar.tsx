'use client'

import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { BusinessTile, getOpeningStatus } from '@/entities/business'
import type { Business } from '@/shared/api/types'
import { useRootFlag } from '@/shared/lib/hooks/useRootFlag'
import { useToday } from '@/shared/lib/hooks/useToday'
import styles from './BusinessBar.module.css'

interface BusinessBarProps {
  business: Business
}

// Apple's product local nav: you always see whose page you are on and can jump between its parts.
export const BusinessBar = ({ business }: BusinessBarProps) => {
  const pathname = usePathname()
  const today = useToday()
  const base = `/${business.slug}`
  const isBooking = pathname === `${base}/book`
  useRootFlag(isBooking ? null : 'business-bar')
  // The overview has its own big «Записаться», so the bar does not repeat it.
  const status = today ? getOpeningStatus(business.hours, today.dayKey, today.minutes) : null
  const sections = [
    { href: base, label: 'Обзор', isActive: pathname === base },
    { href: `${base}/services`, label: 'Услуги и цены', isActive: pathname === `${base}/services` },
    { href: `${base}#masters`, label: 'Мастера', isActive: false },
    { href: `${base}#visit`, label: 'Контакты', isActive: false },
  ]

  // The booking form is its own focused screen with its own bar.
  if (isBooking) return null

  return (
    <nav
      className={styles.bar}
      data-business-bar=''
      aria-label={`Страница бизнеса ${business.name}`}
    >
      <div className={styles.inner}>
        <div className={styles.identity}>
          <NextLink href='/' className={styles.crumb}>
            Каталог
          </NextLink>
          <CaretRight className={styles.separator} weight='bold' aria-hidden />
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
            Записаться
          </NextLink>
        )}
      </div>
    </nav>
  )
}
