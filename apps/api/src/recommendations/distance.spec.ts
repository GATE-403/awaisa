import { describe, expect, it } from 'vitest'
import { haversineKm, nearestByBusiness } from './distance.js'

describe('distance', () => {
  it('measures a known distance in Bishkek', () => {
    // Ala-Too Square to the Osh Bazaar: about 2.5 km.
    expect(haversineKm(42.8766, 74.6037, 42.8746, 74.5737)).toBeCloseTo(2.45, 1)
    expect(haversineKm(42.87, 74.6, 42.87, 74.6)).toBe(0)
  })

  it('keeps the nearest branch of each business', () => {
    const nearest = nearestByBusiness(
      [
        { businessId: 'a', latitude: 42.9, longitude: 74.6 },
        { businessId: 'a', latitude: 42.871, longitude: 74.6 },
        { businessId: 'b', latitude: 42.8, longitude: 74.5 },
      ],
      42.87,
      74.6,
    )
    expect(nearest.get('a')).toBeCloseTo(0.11, 2)
    expect(nearest.get('b')).toBeGreaterThan(10)
    expect(nearest.has('c')).toBe(false)
  })
})
