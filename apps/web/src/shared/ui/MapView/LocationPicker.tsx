'use client'

import { useLingui } from '@lingui/react/macro'
import 'leaflet/dist/leaflet.css'
import { NavigationArrow } from '@phosphor-icons/react/ssr'
import type { Map as LeafletMap } from 'leaflet'
import { useEffect, useRef } from 'react'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import styles from './LocationPicker.module.css'
import type { Point } from './MapView'
import { DEFAULT_CENTER, isDarkTheme, TILE_OPTIONS, TILE_URL } from './mapTiles'

interface LocationPickerProps {
  value: Point | null
  /** `user` when the person moved the map (a drag, «I am here»), `target` after a `target` move. */
  onChange: (point: Point, source: 'user' | 'target') => void
  /** A point to fly to (an address picked from the search); a new object each time it moves. */
  target?: Point | null
}

const PICK_ZOOM = 16

// Like dropping a pin in Maps: the map moves under a fixed pin, so no exact tap is needed.
export const LocationPicker = ({ value, onChange, target = null }: LocationPickerProps) => {
  const { t } = useLingui()
  const { theme } = useTheme()
  const containerRef = useRef<HTMLElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const onChangeRef = useRef(onChange)
  // The next move is ours (flying to a picked address), not the person's.
  const isTargetMoveRef = useRef(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // biome-ignore lint/correctness/useExhaustiveDependencies: the map is created once; the value only seeds it
  useEffect(() => {
    let isActive = true
    void import('leaflet').then(({ default: L }) => {
      if (!isActive || !containerRef.current) return
      const start = value ?? DEFAULT_CENTER
      const map = L.map(containerRef.current, {
        center: [start.latitude, start.longitude],
        zoom: value ? PICK_ZOOM : 12,
        zoomControl: false,
      })
      L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map)
      map.getContainer().dataset.dark = String(isDarkTheme(theme))
      map.on('moveend', () => {
        const center = map.getCenter()
        const source = isTargetMoveRef.current ? 'target' : 'user'
        isTargetMoveRef.current = false
        onChangeRef.current(
          {
            latitude: Math.round(center.lat * 1e6) / 1e6,
            longitude: Math.round(center.lng * 1e6) / 1e6,
          },
          source,
        )
      })
      mapRef.current = map
    })

    return () => {
      isActive = false
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !target) return
    isTargetMoveRef.current = true
    map.setView([target.latitude, target.longitude], PICK_ZOOM)
  }, [target])

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => mapRef.current?.setView([coords.latitude, coords.longitude], PICK_ZOOM),
      () => undefined,
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    <div className={styles.picker}>
      <section
        ref={containerRef}
        className={styles.map}
        aria-label={t`Map: move it so the pin points at the entrance`}
      />
      <span className={styles.pin} aria-hidden='true' />
      <button type='button' className={styles.locate} onClick={locate}>
        <NavigationArrow aria-hidden />I am here
      </button>
    </div>
  )
}
