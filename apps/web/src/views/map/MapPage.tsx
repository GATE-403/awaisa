'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { NavigationArrow } from '@phosphor-icons/react/ssr'
import dynamic from 'next/dynamic'
import NextLink from 'next/link'
import { useState } from 'react'
import { NextFreeProvider } from '@/entities/business'
import type { BusinessKind, MapPlace } from '@/shared/api/types'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { pluralize } from '@/shared/lib/plural'
import type { Point } from '@/shared/ui/MapView/MapView'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { useMapPlaces } from '@/views/map/model/useMapPlaces'
import { PlaceRow } from '@/views/map/ui/PlaceRow'
import styles from './MapPage.module.css'
import { toMarkers } from './mapUtils'

const MapView = dynamic(
  () => import('@/shared/ui/MapView/MapView').then((module) => module.MapView),
  { ssr: false, loading: () => <div className={styles.mapPlaceholder} /> },
)

type LocationState = 'idle' | 'locating' | 'denied'

// Like Apple Maps' search results: the list and the map show the same places, nearest first.
interface MapPageProps {
  /** The kind from the URL, read by the route. */
  kind?: BusinessKind
  /** The list for that kind, rendered on the server before any location is known. */
  initialPlaces?: MapPlace[] | null
  /** The prerendered shell while the server reads the list: nothing is fetched from here. */
  isPending?: boolean
}

export const MapPage = ({ kind, initialPlaces = null, isPending = false }: MapPageProps) => {
  const [location, setLocation] = useState<Point | null>(null)
  const [locationState, setLocationState] = useState<LocationState>('idle')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { places, isLoading, error } = useMapPlaces(location, kind, initialPlaces, !isPending)
  const markers = toMarkers(places)
  const slugs = [...new Set(places.map((place) => place.slug))]

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationState('denied')
      return
    }
    setLocationState('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude })
        setLocationState('idle')
      },
      () => setLocationState('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  const select = (id: string) => {
    setSelectedId(id)
    document.getElementById(`place-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <main>
      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby='map-title'>
          <header className={styles.header}>
            <h1 id='map-title' className={styles.title}>
              Рядом.
              <span className={styles.titleMuted}> Выберите место на карте или в списке.</span>
            </h1>
            <TextTabs
              label='Виды бизнеса'
              items={[{ value: undefined, label: 'Все' }, ...BUSINESS_KINDS].map((item) => ({
                href: item.value ? `/map?kind=${item.value}` : '/map',
                label: item.label,
                isActive: kind === item.value,
              }))}
            />
            <div className={styles.toolbar}>
              <p className={styles.count} aria-live='polite'>
                {isLoading
                  ? 'Ищем…'
                  : location
                    ? `${pluralize(places.length, ['место', 'места', 'мест'])}, ближайшие сверху`
                    : pluralize(places.length, ['место', 'места', 'мест'])}
              </p>
              <Button
                variant={location ? 'secondary' : 'outline'}
                size='sm'
                onClick={locate}
                disabled={locationState === 'locating'}
              >
                <NavigationArrow weight='fill' aria-hidden />
                {locationState === 'locating'
                  ? 'Определяем…'
                  : location
                    ? 'Обновить место'
                    : 'Рядом со мной'}
              </Button>
            </div>
            {locationState === 'denied' && (
              <p className={styles.hint} aria-live='polite'>
                Нет доступа к геопозиции — разрешите его в настройках браузера или найдите место на
                карте.
              </p>
            )}
            {error && (
              <p className={styles.hint} role='alert'>
                {error}
              </p>
            )}
          </header>

          {isLoading && places.length === 0 ? (
            <Skeleton className={styles.skeleton} />
          ) : places.length === 0 ? (
            <p className={styles.empty}>
              Здесь пока нет мест на карте. Попробуйте другой вид или{' '}
              <NextLink href='/' className={styles.link}>
                каталог
              </NextLink>
              .
            </p>
          ) : (
            <NextFreeProvider slugs={slugs}>
              <ul className={styles.list}>
                {places.map((place) => (
                  <PlaceRow
                    key={place.branchId}
                    place={place}
                    isSelected={place.branchId === selectedId}
                    onSelect={() => setSelectedId(place.branchId)}
                  />
                ))}
              </ul>
            </NextFreeProvider>
          )}
        </section>

        <div className={styles.mapArea}>
          <MapView
            markers={markers}
            selectedId={selectedId}
            userLocation={location}
            onSelect={select}
            fitKey={`${kind ?? 'all'}|${location?.latitude ?? ''}|${places.length}`}
            label='Карта салонов и мастеров'
          />
        </div>
      </div>
    </main>
  )
}
