'use client'

import { Toggle, ToggleGroup } from '@awaisa/ui/ToggleGroup'
import { useState } from 'react'
import type { BusinessCard as BusinessCardData } from '@/common/api/types'
import styles from '../../CatalogPage.module.css'
import { BusinessCard } from '../BusinessCard/BusinessCard'
import { useNextFree } from '../BusinessCard/NextFreeProvider'

type CatalogSort = 'recommended' | 'price' | 'soon'

interface SortedGridProps {
  businesses: BusinessCardData[]
  initialSort: CatalogSort
}

const SORTS: { value: CatalogSort; label: string }[] = [
  { value: 'recommended', label: 'Рекомендуем' },
  { value: 'soon', label: 'Раньше свободно' },
  { value: 'price', label: 'Дешевле' },
]

const NO_SLOT = '9999-12-31 99:99'

export const SortedGrid = ({ businesses, initialSort }: SortedGridProps) => {
  const [sort, setSort] = useState(initialSort)
  const nextFree = useNextFree()
  const sorted =
    sort === 'price'
      ? [...businesses].sort((first, second) => first.minPrice - second.minPrice)
      : sort === 'soon' && nextFree
        ? [...businesses].sort((first, second) => {
            const a = nextFree[first.slug]
            const b = nextFree[second.slug]
            return (a ? `${a.date} ${a.time}` : NO_SLOT).localeCompare(
              b ? `${b.date} ${b.time}` : NO_SLOT,
            )
          })
        : businesses

  return (
    <>
      <ToggleGroup
        aria-label='Сортировка'
        layout='scroll'
        value={[sort]}
        onValueChange={(values) => {
          const next = values.at(-1)
          if (next) setSort(next as CatalogSort)
        }}
      >
        {SORTS.map((item) => (
          <Toggle key={item.value} value={item.value} size='sm'>
            {item.label}
          </Toggle>
        ))}
      </ToggleGroup>
      <ul className={styles.grid}>
        {sorted.map((business) => (
          <li key={business.slug}>
            <BusinessCard business={business} />
          </li>
        ))}
      </ul>
    </>
  )
}

export type { CatalogSort }
