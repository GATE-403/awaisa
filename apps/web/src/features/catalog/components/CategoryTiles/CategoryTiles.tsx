import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import type { BusinessCard, BusinessKind } from '@/common/api/types'
import { pluralize } from '@/common/utils/plural'
import { KIND_TINTS } from '@/constants/kindStyles'
import { BUSINESS_KINDS } from '@/constants/platform'
import styles from './CategoryTiles.module.css'

interface CategoryTilesProps {
  kind: BusinessKind | undefined
  query: string
  all: BusinessCard[]
}

const toHref = (kind: BusinessKind | undefined, query: string) => {
  const params = new URLSearchParams()
  if (kind) params.set('kind', kind)
  if (query) params.set('q', query)
  const search = params.toString()

  return search ? `/?${search}` : '/'
}

// Marketplace-style categories: a tinted tile per kind with how many places it has.
export const CategoryTiles = ({ kind, query, all }: CategoryTilesProps) => {
  const kinds = BUSINESS_KINDS.filter(
    (item) => item.value === kind || all.some((business) => business.kind === item.value),
  )

  return (
    <nav aria-label='Виды бизнеса' className={styles.scroller}>
      <ul className={styles.list}>
        <li>
          <NextLink
            href={toHref(undefined, query)}
            className={styles.tile}
            style={{ '--tint': 'var(--system-blue)' } as CSSProperties}
            aria-current={!kind ? 'page' : undefined}
          >
            <span className={styles.label}>Все</span>
            <span className={styles.count}>
              {pluralize(all.length, ['место', 'места', 'мест'])}
            </span>
          </NextLink>
        </li>
        {kinds.map((item) => {
          const count = all.filter((business) => business.kind === item.value).length

          return (
            <li key={item.value}>
              <NextLink
                href={toHref(item.value, query)}
                className={styles.tile}
                style={{ '--tint': KIND_TINTS[item.value] } as CSSProperties}
                aria-current={kind === item.value ? 'page' : undefined}
              >
                <span className={styles.label}>{item.label}</span>
                <span className={styles.count}>{pluralize(count, ['место', 'места', 'мест'])}</span>
              </NextLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
