'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { NavigationArrow } from '@phosphor-icons/react/ssr'
import dynamic from 'next/dynamic'
import NextLink from 'next/link'
import { type MouseEvent, type PointerEvent, type UIEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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

// Phones: how much of the screen the map keeps above the list, like Apple Maps' sheet detents.
type Detent = 'peek' | 'half' | 'full'
const MAP_SHARE: Record<Detent, number> = { peek: 0.72, half: 0.42, full: 0 }
const NEXT_DETENT: Record<Detent, Detent> = { peek: 'half', half: 'full', full: 'peek' }
const DETENT_LABEL: Record<Detent, string> = {
  peek: 'Список свёрнут',
  half: 'Список наполовину',
  full: 'Список на весь экран',
}

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
  const [detent, setDetent] = useState<Detent>('half')
  const layoutRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const drag = useRef<{
    x: number
    y: number
    map: number
    lastMap?: number
    height: number
    t: number
    v: number
    axis: 'x' | 'y' | null
    pointerId: number
  } | null>(null)
  const wasDragged = useRef(false)
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

  // The sheet's head (grabber, kinds, count) drags it to any height; let go and it settles on the
  // nearest detent, a flick carrying on in its direction. Sideways moves stay with the kind tabs,
  // and a drag never turns into a tap on what it started over.
  const startDrag = (event: PointerEvent<HTMLElement>) => {
    const layout = layoutRef.current
    if (!layout || event.button !== 0) return
    const height = layout.clientHeight
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      map: height * MAP_SHARE[detent],
      height,
      t: event.timeStamp,
      v: 0,
      axis: null,
      pointerId: event.pointerId,
    }
  }

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current
    const layout = layoutRef.current
    if (!state || !layout) return
    const dx = event.clientX - state.x
    const delta = event.clientY - state.y
    if (!state.axis) {
      if (Math.abs(dx) < 6 && Math.abs(delta) < 6) return
      state.axis = Math.abs(delta) > Math.abs(dx) ? 'y' : 'x'
      if (state.axis === 'y') event.currentTarget.setPointerCapture(state.pointerId)
    }
    if (state.axis !== 'y') return
    const map = Math.min(Math.max(state.map + delta, 0), state.height * 0.85)
    const dt = Math.max(event.timeStamp - state.t, 1)
    state.v = (map - (state.lastMap ?? state.map)) / dt
    state.lastMap = map
    state.t = event.timeStamp
    // Only the sheet moves under the finger (a transform, no layout); the map is resized once,
    // when the sheet settles — resizing Leaflet every frame is what made it stutter on phones.
    const panel = panelRef.current
    if (panel) {
      panel.style.transition = 'none'
      panel.style.transform = `translateY(${map - state.map}px)`
    }
  }

  const endDrag = () => {
    const state = drag.current
    const layout = layoutRef.current
    drag.current = null
    if (!state || !layout || state.axis !== 'y') return
    // Only the click this very release would make is swallowed.
    wasDragged.current = true
    window.setTimeout(() => {
      wasDragged.current = false
    }, 0)
    // Where the sheet would coast to (px per ms × 200 ms), then the closest detent to that.
    const projected = ((state.lastMap ?? state.map) + state.v * 200) / state.height
    const nearest = (Object.keys(MAP_SHARE) as Detent[]).reduce((best, item) =>
      Math.abs(MAP_SHARE[item] - projected) < Math.abs(MAP_SHARE[best] - projected) ? item : best,
    )
    settle(nearest)
  }

  // FLIP: note where the sheet is, switch the detent at once (the map is resized once), then
  // slide the sheet from where it was to where it now belongs.
  const settle = (next: Detent) => {
    const panel = panelRef.current
    const before = panel?.getBoundingClientRect().top ?? 0
    flushSync(() => setDetent(next))
    if (!panel) return
    panel.style.transition = 'none'
    panel.style.transform = 'none'
    const after = panel.getBoundingClientRect().top
    if (
      Math.abs(before - after) < 1 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      panel.style.removeProperty('transition')
      panel.style.removeProperty('transform')
      return
    }
    panel.style.transform = `translateY(${before - after}px)`
    void panel.offsetHeight
    panel.style.transition = 'transform 380ms var(--ease-spring)'
    panel.style.transform = 'translateY(0)'
    const clear = () => {
      panel.style.removeProperty('transition')
      panel.style.removeProperty('transform')
      panel.removeEventListener('transitionend', clear)
    }
    panel.addEventListener('transitionend', clear)
  }

  const swallowClickAfterDrag = (event: MouseEvent) => {
    if (!wasDragged.current) return
    wasDragged.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  // Reading down the list wants the room: the sheet opens to full screen, like Apple Maps.
  const expandOnScroll = (event: UIEvent<HTMLElement>) => {
    if (detent !== 'full' && event.currentTarget.scrollTop > 24 && window.innerWidth < 900) {
      settle('full')
    }
  }

  return (
    <main>
      <div ref={layoutRef} className={styles.layout} data-detent={detent}>
        <section
          ref={panelRef}
          className={styles.panel}
          aria-labelledby='map-title'
          onScroll={expandOnScroll}
        >
          <header
            className={styles.header}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={swallowClickAfterDrag}
          >
            <button
              type='button'
              className={styles.grabber}
              aria-label={`${DETENT_LABEL[detent]}. Изменить высоту списка`}
              onClick={() => settle(NEXT_DETENT[detent])}
            />
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
