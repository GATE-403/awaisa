import type { GeoPlace } from '@awaisa/contracts'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { currentRegion } from '../common/region.js'
import type { Env } from '../config/env.js'
import { type PhotonFeature, toPlace, toPlaces } from './photon.js'

const LIMIT = 6
const TIMEOUT_MS = 4000
// A generic client name: the service asks for one, nothing about the business or the person.
const USER_AGENT = 'Awaisa/1.0 (booking platform)'

/**
 * Addresses and map points for the cabinet's branches: what was typed → places to pick, a point
 * on the map → its address. Photon (OpenStreetMap) by default; `GEOCODER=off` turns it off, and
 * another provider (2GIS, once there is a key) goes behind the same two calls. A slow or failing
 * provider never fails the sheet: no suggestions, the owner types as before.
 */
@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name)

  constructor(private readonly config: ConfigService<Env, true>) {}

  get isAvailable() {
    return this.config.get('GEOCODER', { infer: true }) !== 'off'
  }

  async search(query: string): Promise<GeoPlace[]> {
    if (!this.isAvailable) return []
    const { city, geocoderBox } = currentRegion()
    // The region's city ranks first; its box, when it has one, bounds the search.
    const params = new URLSearchParams({
      q: query,
      limit: String(LIMIT * 2),
      lat: String(city.center.latitude),
      lon: String(city.center.longitude),
      ...(geocoderBox ? { bbox: geocoderBox } : {}),
    })
    const features = await this.request(`/api/?${params}`)
    return toPlaces(features).slice(0, LIMIT)
  }

  async reverse(latitude: number, longitude: number): Promise<GeoPlace | null> {
    if (!this.isAvailable) return null
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      limit: '1',
    })
    const [feature] = await this.request(`/reverse?${params}`)
    return feature ? toPlace(feature) : null
  }

  private async request(path: string): Promise<PhotonFeature[]> {
    const base = this.config.get('PHOTON_URL', { infer: true })
    try {
      const response = await fetch(`${base}${path}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) {
        this.logger.warn(`Photon answered ${response.status}`)
        return []
      }
      const body = (await response.json()) as { features?: PhotonFeature[] }
      return body.features ?? []
    } catch (error) {
      this.logger.warn(`Photon unreachable: ${error instanceof Error ? error.message : error}`)
      return []
    }
  }
}
