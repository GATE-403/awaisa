import { Suspense } from 'react'
import type { BusinessKind } from '@/common/api/types'
import { PageSkeleton } from '@/common/components/PageSkeleton/PageSkeleton'
import { BUSINESS_KINDS } from '@/constants/platform'
import styles from './CatalogPage.module.css'
import { BusinessGrid } from './components/BusinessGrid'
import { CatalogSearch } from './components/CatalogSearch'

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const toKind = (value: unknown) =>
  BUSINESS_KINDS.find((item) => item.value === value)?.value as BusinessKind | undefined

const toQuery = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 80) : '')

export const CatalogPage = ({ searchParams }: CatalogPageProps) => (
  <main className={styles.page}>
    <header className={styles.hero}>
      <h1 className={styles.title}>
        Запись
        <span className={styles.titleMuted}>. Салоны и мастера Бишкека — в пару касаний.</span>
      </h1>
    </header>
    <Suspense fallback={<PageSkeleton />}>
      {searchParams.then((params) => {
        const kind = toKind(params.kind)
        const query = toQuery(params.q)

        return (
          <>
            <CatalogSearch kind={kind} query={query} />
            <BusinessGrid kind={kind} query={query} />
          </>
        )
      })}
    </Suspense>
  </main>
)
