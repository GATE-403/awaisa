import { MagnifyingGlass, MapTrifold } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { BusinessKind } from '@/common/api/types'
import styles from './CatalogHeader.module.css'

interface CatalogHeaderProps {
  kind: BusinessKind | undefined
  query: string
}

// Search first, like a marketplace: a plain GET form, so it works before hydration too.
export const CatalogHeader = ({ kind, query }: CatalogHeaderProps) => (
  <header className={styles.header}>
    <h1 className={styles.title}>
      Запись<span className={styles.muted}> в салоны и к мастерам</span>
    </h1>
    <div className={styles.row}>
      <search className={styles.searchLandmark}>
        <form action='/' className={styles.search}>
          <MagnifyingGlass className={styles.icon} aria-hidden />
          <input
            type='search'
            name='q'
            defaultValue={query}
            placeholder='Услуга, салон или адрес'
            aria-label='Что ищете'
            className={styles.input}
            enterKeyHint='search'
            autoComplete='off'
          />
          {kind && <input type='hidden' name='kind' value={kind} />}
          <button type='submit' className={styles.submit}>
            Найти
          </button>
        </form>
      </search>
      <NextLink
        href={kind ? `/map?kind=${kind}` : '/map'}
        className={styles.map}
        aria-label='На карте'
      >
        <MapTrifold weight='bold' aria-hidden />
        <span>На карте</span>
      </NextLink>
    </div>
  </header>
)
