'use client'

import 'leaflet/dist/leaflet.css'
import type { LayerGroup, Map as LeafletMap, TileLayer } from 'leaflet'
import { useEffect, useRef } from 'react'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import styles from './MapView.module.css'
import { DEFAULT_CENTER, DEFAULT_ZOOM, isDarkTheme, TILE_OPTIONS, TILE_URL } from './mapTiles'

type MapMarker = {
  id: string
  latitude: number
  longitude: number
  label: string
  title: string
  tint: string
}

type Point = { latitude: number; longitude: number }

interface MapViewProps {
  markers: MapMarker[]
  selectedId?: string | null
  userLocation?: Point | null
  onSelect?: (id: string) => void
  /** Refit the view to all markers when this changes (a new search, a new location). */
  fitKey?: string
  label: string
  className?: string
  /** A picture of a place inside a page: no dragging or zooming, so the page scrolls freely. */
  isStatic?: boolean
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

// Leaflet touches `window` on import, so it is loaded only in the browser.
const loadLeaflet = () => import('leaflet').then((module) => module.default)

export const MapView = ({
  markers,
  selectedId = null,
  userLocation = null,
  onSelect,
  fitKey,
  label,
  className,
  isStatic = false,
}: MapViewProps) => {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const tilesRef = useRef<TileLayer | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // biome-ignore lint/correctness/useExhaustiveDependencies: the map is created once; isStatic is fixed per instance
  useEffect(() => {
    let isActive = true
    void loadLeaflet().then((L) => {
      if (!isActive || !containerRef.current || mapRef.current) return
      const map = L.map(containerRef.current, {
        center: [DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude],
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: true,
        dragging: !isStatic,
        scrollWheelZoom: !isStatic,
        touchZoom: !isStatic,
        doubleClickZoom: !isStatic,
        boxZoom: !isStatic,
        keyboard: !isStatic,
      })
      if (!isStatic) L.control.zoom({ position: 'bottomright' }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      // Draw markers and tiles now that the map exists.
      containerRef.current.dispatchEvent(new Event('map-ready'))
    })

    return () => {
      isActive = false
      mapRef.current?.remove()
      mapRef.current = null
      tilesRef.current = null
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const draw = () =>
      void loadLeaflet().then((L) => {
        const map = mapRef.current
        const layer = layerRef.current
        if (!map || !layer) return

        tilesRef.current ??= L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map)
        // One light tile set; the dark theme dims it with a filter (see MapView.module.css).
        map.getContainer().dataset.dark = String(isDarkTheme(theme))

        layer.clearLayers()
        for (const marker of markers) {
          const isSelected = marker.id === selectedId
          const icon = L.divIcon({
            className: styles.markerHost,
            html: `<span class="${styles.marker}" data-selected="${isSelected}" style="--tint:${marker.tint}">${escapeHtml(marker.label)}</span>`,
            iconSize: isSelected ? [44, 44] : [34, 34],
            iconAnchor: isSelected ? [22, 22] : [17, 17],
          })
          L.marker([marker.latitude, marker.longitude], {
            icon,
            title: marker.title,
            alt: marker.title,
            keyboard: true,
            zIndexOffset: isSelected ? 1000 : 0,
          })
            .on('click', () => onSelectRef.current?.(marker.id))
            .addTo(layer)
        }
        if (userLocation) {
          // Leaflet draws SVG with literal colours, so the tokens are read from CSS.
          const css = getComputedStyle(document.documentElement)
          L.circleMarker([userLocation.latitude, userLocation.longitude], {
            radius: 7,
            weight: 3,
            color: css.getPropertyValue('--color-surface').trim(),
            fillColor: css.getPropertyValue('--color-primary').trim(),
            fillOpacity: 1,
          }).addTo(layer)
        }
      })

    draw()
    container?.addEventListener('map-ready', draw)

    return () => container?.removeEventListener('map-ready', draw)
  }, [markers, selectedId, userLocation, theme])

  // biome-ignore lint/correctness/useExhaustiveDependencies: refit only when fitKey changes
  useEffect(() => {
    const container = containerRef.current
    const fit = () =>
      void loadLeaflet().then((L) => {
        const map = mapRef.current
        if (!map) return
        const points: [number, number][] = markers.map((marker) => [
          marker.latitude,
          marker.longitude,
        ])
        if (userLocation) points.push([userLocation.latitude, userLocation.longitude])
        if (points.length === 1 && points[0]) map.setView(points[0], 14)
        if (points.length > 1)
          map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 })
      })

    fit()
    container?.addEventListener('map-ready', fit)

    return () => container?.removeEventListener('map-ready', fit)
  }, [fitKey])

  // Bring the selected place into view, like tapping a result in Maps.
  useEffect(() => {
    const marker = markers.find((item) => item.id === selectedId)
    const map = mapRef.current
    if (!marker || !map) return
    map.panTo([marker.latitude, marker.longitude], { animate: true })
  }, [selectedId, markers])

  return (
    <section
      ref={containerRef}
      className={className ? `${styles.map} ${className}` : styles.map}
      aria-label={label}
    />
  )
}

export type { MapMarker, Point }
