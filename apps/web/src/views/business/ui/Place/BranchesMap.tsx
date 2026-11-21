'use client'

import dynamic from 'next/dynamic'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { pickTint } from '@/entities/business'
import type { Business } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import styles from './BranchesMap.module.css'

const MapView = dynamic(
  () => import('@/shared/ui/MapView/MapView').then((module) => module.MapView),
  { ssr: false, loading: () => <div className={styles.mapPlaceholder} /> },
)

interface BranchesMapProps {
  business: Business
}

export const BranchesMap = ({ business }: BranchesMapProps) => {
  const t = useT()
  const router = useRouter()
  const markers = business.branches.flatMap((branch) =>
    branch.latitude !== null && branch.longitude !== null
      ? [
          {
            id: branch.id,
            latitude: branch.latitude,
            longitude: branch.longitude,
            label: branch.name.charAt(0).toUpperCase(),
            title: `${business.name}, ${branch.name}`,
            tint: pickTint(business.name),
          },
        ]
      : [],
  )

  return (
    <div className={styles.mapWrap}>
      <MapView
        markers={markers}
        fitKey={business.slug}
        label={t('{name} на карте', { name: business.name })}
        className={styles.map}
        isStatic
        onSelect={(id) =>
          business.branches.length > 1 && router.push(`/${business.slug}/book?branch=${id}`)
        }
      />
      <NextLink href='/map' className={styles.mapLink}>
        {t('Открыть на карте')}
      </NextLink>
    </div>
  )
}
