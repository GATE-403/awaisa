import { useLingui } from '@lingui/react/macro'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { breadcrumbJsonLd } from '@/shared/lib/seo/breadcrumbJsonLd'
import { JsonLd } from '@/shared/lib/seo/JsonLd'
import styles from './Breadcrumbs.module.css'

/** `label` in the page's language. */
type Crumb = { label: string; href: string }

interface BreadcrumbsProps {
  /** From the catalog down; the last one is this page. */
  items: Crumb[]
  align?: 'start' | 'center'
  className?: string
}

// Where this page sits, one quiet footnote line («Catalogue › Top»): the way back on pages
// that have no business bar or tab, plus the same trail as schema.org markup for search.
export const Breadcrumbs = ({ items, align = 'start', className }: BreadcrumbsProps) => {
  const { t } = useLingui()

  return (
    <>
      <nav
        className={className ? `${styles.crumbs} ${className}` : styles.crumbs}
        aria-label={t`You are here`}
        data-align={align}
      >
        <ol className={styles.list}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <li key={item.href} className={styles.item}>
                {isLast ? (
                  <span className={styles.current} aria-current='page'>
                    {item.label}
                  </span>
                ) : (
                  <>
                    <NextLink href={item.href} className={styles.link}>
                      {item.label}
                    </NextLink>
                    <span className={styles.separator} aria-hidden>
                      ›
                    </span>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(items)} />
    </>
  )
}

export type { Crumb }
