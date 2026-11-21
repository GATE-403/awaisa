import NextLink from 'next/link'
import { T } from '@/shared/i18n'
import { breadcrumbJsonLd } from '@/shared/lib/seo/breadcrumbJsonLd'
import { JsonLd } from '@/shared/lib/seo/JsonLd'
import styles from './Breadcrumbs.module.css'

type Crumb = { label: string; href: string }

interface BreadcrumbsProps {
  /** From the catalog down; the last one is this page. */
  items: Crumb[]
  align?: 'start' | 'center'
  className?: string
}

// Where this page sits, one quiet footnote line («Каталог › Рейтинг»): the way back on pages
// that have no business bar or tab, plus the same trail as schema.org markup for search.
export const Breadcrumbs = ({ items, align = 'start', className }: BreadcrumbsProps) => (
  <>
    <nav
      className={className ? `${styles.crumbs} ${className}` : styles.crumbs}
      aria-label='Вы здесь'
      data-align={align}
    >
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={item.href} className={styles.item}>
              {isLast ? (
                <span className={styles.current} aria-current='page'>
                  <T>{item.label}</T>
                </span>
              ) : (
                <>
                  <NextLink href={item.href} className={styles.link}>
                    <T>{item.label}</T>
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

export type { Crumb }
