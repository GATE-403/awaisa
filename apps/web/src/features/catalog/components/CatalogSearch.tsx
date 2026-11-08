import NextLink from 'next/link'
import type { BusinessKind } from '@/common/api/types'
import { BUSINESS_KINDS } from '@/constants/platform'
import styles from '../CatalogPage.module.css'

interface CatalogSearchProps {
  kind: BusinessKind | undefined
  query: string
}

const kindHref = (kind: BusinessKind | undefined, query: string) => {
  const params = new URLSearchParams()
  if (kind) params.set('kind', kind)
  if (query) params.set('q', query)
  const search = params.toString()

  return search ? `/?${search}` : '/'
}

export const CatalogSearch = ({ kind, query }: CatalogSearchProps) => (
  <div className={styles.filters}>
    <nav aria-label='Виды бизнеса' className={styles.kinds}>
      <NextLink
        href={kindHref(undefined, query)}
        className={styles.kind}
        aria-current={kind ? undefined : 'page'}
      >
        Все
      </NextLink>
      {BUSINESS_KINDS.map((item) => (
        <NextLink
          key={item.value}
          href={kindHref(item.value, query)}
          className={styles.kind}
          aria-current={kind === item.value ? 'page' : undefined}
        >
          {item.label}
        </NextLink>
      ))}
    </nav>
  </div>
)
