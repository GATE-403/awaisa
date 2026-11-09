import type { BusinessKind } from '@/common/api/types'
import { TextTabs } from '@/common/components/TextTabs/TextTabs'
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
    <TextTabs
      label='Виды бизнеса'
      items={[
        { href: kindHref(undefined, query), label: 'Все', isActive: !kind },
        ...BUSINESS_KINDS.map((item) => ({
          href: kindHref(item.value, query),
          label: item.label,
          isActive: kind === item.value,
        })),
      ]}
    />
  </div>
)
