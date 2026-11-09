'use client'

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
  onChange: (point: Point) => void
}

const PICK_ZOOM = 16

// Like dropping a pin in Maps: the map moves under a fixed pin, so no exact tap is needed.
export const LocationPicker = ({ value, onChange }: LocationPickerProps) => {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const onChangeRef = useRef(onChange)

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
        onChangeRef.current({
          latitude: Math.round(center.lat * 1e6) / 1e6,
          longitude: Math.round(center.lng * 1e6) / 1e6,
        })
      })
      mapRef.current = map
    })

    return () => {
      isActive = false
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

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
        aria-label='Карта: передвиньте, чтобы метка указала на вход'
      />
      <span className={styles.pin} aria-hidden='true' />
      <button type='button' className={styles.locate} onClick={locate}>
        <NavigationArrow weight='fill' aria-hidden />Я здесь
      </button>
    </div>
  )
}
