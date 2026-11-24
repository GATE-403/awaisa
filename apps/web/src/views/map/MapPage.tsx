'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { MapPin, NavigationArrow } from '@phosphor-icons/react/ssr'
import dynamic from 'next/dynamic'
import NextLink from 'next/link'
import {
  type MouseEvent,
  type PointerEvent,
  type UIEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'
import { NextFreeProvider } from '@/entities/business'
import { PlacePickerSheet } from '@/features/myPlace'
import type { BusinessKind, MapPlace } from '@/shared/api/types'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { useT } from '@/shared/i18n'
import { useMyPlace } from '@/shared/lib/myPlace'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
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

// Phones: how much of the screen the map keeps above the list, like Apple Maps' sheet detents.
type Detent = 'peek' | 'half' | 'full'
const MAP_SHARE: Record<Detent, number> = { peek: 0.72, half: 0.42, full: 0 }
const NEXT_DETENT: Record<Detent, Detent> = { peek: 'half', half: 'full', full: 'peek' }
const DETENT_LABEL: Record<Detent, string> = {
  peek: 'List collapsed',
  half: 'List half open',
  full: 'List full screen',
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
  const t = useT()
  const myPlace = useMyPlace()
  // The place picked by hand or the browser's location - kept on the device for next time.
  const location: Point | null = myPlace ? { latitude: myPlace.lat, longitude: myPlace.lng } : null
  const [isPicking, setIsPicking] = useState(false)
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

  const detentRef = useRef(detent)
  detentRef.current = detent

  // Pulling the list down from its very top carries on as a drag of the sheet itself, which then
  // settles lower or collapses - like Apple Maps; before, the list just stopped at its first row.
  // Touch events, not pointer ones: a scroll container cancels the pointer once it scrolls.
  // biome-ignore lint/correctness/useExhaustiveDependencies: handlers read refs; bound once
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    let start: { x: number; y: number; isFromList: boolean } | null = null
    const handleStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      const target = event.target as HTMLElement | null
      // The head has its own drag; only a pull that starts in the list is handled here.
      start =
        touch && !target?.closest('header')
          ? { x: touch.clientX, y: touch.clientY, isFromList: true }
          : null
    }
    const handleMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!start || !touch || window.innerWidth >= 900) return
      if (!drag.current) {
        const dy = touch.clientY - start.y
        const dx = touch.clientX - start.x
        if (panel.scrollTop > 0 || dy < 8 || Math.abs(dx) > Math.abs(dy)) return
        const layout = layoutRef.current
        if (!layout) return
        drag.current = {
          x: touch.clientX,
          y: touch.clientY,
          map: layout.clientHeight * MAP_SHARE[detentRef.current],
          height: layout.clientHeight,
          t: event.timeStamp,
          v: 0,
          axis: 'y',
          pointerId: -1,
        }
      }
      event.preventDefault()
      follow(touch.clientY, event.timeStamp)
    }
    const handleEnd = () => {
      start = null
      if (drag.current?.pointerId === -1) endDrag()
    }
    panel.addEventListener('touchstart', handleStart, { passive: true })
    panel.addEventListener('touchmove', handleMove, { passive: false })
    panel.addEventListener('touchend', handleEnd)
    panel.addEventListener('touchcancel', handleEnd)
    return () => {
      panel.removeEventListener('touchstart', handleStart)
      panel.removeEventListener('touchmove', handleMove)
      panel.removeEventListener('touchend', handleEnd)
      panel.removeEventListener('touchcancel', handleEnd)
    }
  }, [])

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

  // Moves the sheet under the finger: a transform only, no layout. The map is resized once, when
  // the sheet settles - resizing Leaflet every frame is what made it stutter on phones.
  const follow = (clientY: number, timeStamp: number) => {
    const state = drag.current
    if (!state) return
    const map = Math.min(Math.max(state.map + clientY - state.y, 0), state.height * 0.85)
    const dt = Math.max(timeStamp - state.t, 1)
    state.v = (map - (state.lastMap ?? state.map)) / dt
    state.lastMap = map
    state.t = timeStamp
    const panel = panelRef.current
    if (panel) {
      panel.style.transition = 'none'
      panel.style.transform = `translateY(${map - state.map}px)`
    }
  }

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current
    if (!state || !layoutRef.current) return
    const dx = event.clientX - state.x
    const delta = event.clientY - state.y
    if (!state.axis) {
      if (Math.abs(dx) < 6 && Math.abs(delta) < 6) return
      state.axis = Math.abs(delta) > Math.abs(dx) ? 'y' : 'x'
      if (state.axis === 'y') event.currentTarget.setPointerCapture(state.pointerId)
    }
    if (state.axis !== 'y') return
    follow(event.clientY, event.timeStamp)
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
              aria-label={t('{state}. Change the list height', { state: t(DETENT_LABEL[detent]) })}
              onClick={() => settle(NEXT_DETENT[detent])}
            />
            <h1 id='map-title' className={styles.title}>
              {t('Nearby.')}
              <span className={styles.titleMuted}>
                {' '}
                {t('Pick a place on the map or in the list.')}
              </span>
            </h1>
            <TextTabs
              label={t('Business types')}
              items={[{ value: undefined, label: t('All') }, ...BUSINESS_KINDS].map((item) => ({
                href: item.value ? `/map?kind=${item.value}` : '/map',
                label: t(item.label),
                isActive: kind === item.value,
              }))}
            />
            <div className={styles.toolbar}>
              <p className={styles.count} aria-live='polite'>
                {isLoading
                  ? t('Searching…')
                  : location
                    ? t('{count}, nearest first', {
                        count: t.count(places.length, ['place', 'places']),
                      })
                    : t.count(places.length, ['place', 'places'])}
              </p>
              {/* Where the visitor is: the browser's location or a district by name - the list
                  is sorted from there and the map shows the spot. */}
              <Button
                variant={location ? 'secondary' : 'outline'}
                size='sm'
                onClick={() => setIsPicking(true)}
              >
                <NavigationArrow aria-hidden />
                {myPlace ? t(myPlace.label) : t('Where are you?')}
              </Button>
            </div>
            {!location && (
              <p className={styles.hint}>
                {t('Tell us where you are: we will show the nearest places and a dot on the map.')}
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
            <EmptyState
              variant='inline'
              text={
                <>
                  {t('No places on the map here yet. Try another type or the')}{' '}
                  <NextLink href='/'>{t('catalogue')}</NextLink>.
                </>
              }
            />
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

        {isPicking && <PlacePickerSheet onClose={() => setIsPicking(false)} />}
        {detent === 'full' && (
          // The list over the whole screen hides the map: one floating button brings it back,
          // like «Карта» in a listings app - the grabber alone was not found.
          <button
            type='button'
            className={styles.showMap}
            onClick={() => {
              panelRef.current?.scrollTo({ top: 0 })
              settle('half')
            }}
          >
            <MapPin aria-hidden />
            {t('Map')}
          </button>
        )}
        <div className={styles.mapArea}>
          <MapView
            markers={markers}
            selectedId={selectedId}
            userLocation={location}
            onSelect={select}
            fitKey={`${kind ?? 'all'}|${location?.latitude ?? ''}|${places.length}`}
            label={t('Map of salons and specialists')}
          />
        </div>
      </div>
    </main>
  )
}
