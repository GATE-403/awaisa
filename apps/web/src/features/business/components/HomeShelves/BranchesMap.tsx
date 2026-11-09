'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import type { Business } from '@/common/api/types'
import { pickTint } from '@/common/components/BusinessTile/BusinessTile'
import styles from './HomeShelves.module.css'

const MapView = dynamic(
  () => import('@/common/components/MapView/MapView').then((module) => module.MapView),
  { ssr: false, loading: () => <div className={styles.mapPlaceholder} /> },
)

interface BranchesMapProps {
  business: Business
}

export const BranchesMap = ({ business }: BranchesMapProps) => {
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
    <MapView
      markers={markers}
      fitKey={business.slug}
      label={`${business.name} на карте`}
      className={styles.map}
      onSelect={(id) =>
        business.branches.length > 1 && router.push(`/${business.slug}/book?branch=${id}`)
      }
    />
  )
}
