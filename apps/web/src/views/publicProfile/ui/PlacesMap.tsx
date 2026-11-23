'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { pickTint } from '@/entities/business'
import type { PublicProfile } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import styles from '../ProfilePage.module.css'

const MapView = dynamic(
  () => import('@/shared/ui/MapView/MapView').then((module) => module.MapView),
  { ssr: false, loading: () => <div className={styles.mapPlaceholder} /> },
)

interface PlacesMapProps {
  places: PublicProfile['places']
}

// Where the person has been, as pins on the city (the «Знает город» medal made visible): each
// place in its own colour, the visits as its label; a pin opens the place.
export const PlacesMap = ({ places }: PlacesMapProps) => {
  const t = useT()
  const router = useRouter()
  const markers = places.flatMap((place) =>
    place.latitude != null && place.longitude != null
      ? [
          {
            id: place.slug,
            latitude: place.latitude,
            longitude: place.longitude,
            label: String(place.visits),
            title: `${place.name}: ${t.count(place.visits, ['визит', 'визита', 'визитов'])}`,
            tint: pickTint(place.name),
          },
        ]
      : [],
  )
  if (markers.length < 2) return null

  return (
    <div className={styles.mapWrap}>
      <MapView
        markers={markers}
        fitKey={markers.map((marker) => marker.id).join()}
        label={t('Места на карте')}
        className={styles.map}
        isStatic
        onSelect={(slug) => router.push(`/${slug}`)}
      />
    </div>
  )
}
