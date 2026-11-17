import { describe, expect, it } from 'vitest'
import { menuOverlap, type PlaceSignals, rankSimilarPlaces } from './similar-places.js'

const place = (slug: string, overrides: Partial<PlaceSignals> = {}): PlaceSignals => ({
  slug,
  pins: [{ latitude: 42.87, longitude: 74.6 }],
  services: ['Маникюр с покрытием', 'Педикюр'],
  minPrice: 1000,
  rating: null,
  reviewsCount: 0,
  ...overrides,
})

describe('similar places', () => {
  it('leaves the place itself out', () => {
    expect(rankSimilarPlaces(place('a'), [place('a'), place('b')])).toEqual(['b'])
  })

  it('puts a nearby place before one across the city', () => {
    const far = place('far', { pins: [{ latitude: 42.8, longitude: 74.5 }] })
    const near = place('near', { pins: [{ latitude: 42.871, longitude: 74.601 }] })
    expect(rankSimilarPlaces(place('target'), [far, near])).toEqual(['near', 'far'])
  })

  it('reads the menu by service names, ignoring case, ё and punctuation', () => {
    expect(menuOverlap(['Маникюр с покрытием'], ['маникюр, с покрытием'])).toBe(1)
    expect(menuOverlap(['Свёкла'], ['свекла'])).toBe(1)
    expect(menuOverlap(['Маникюр'], ['Стрижка'])).toBe(0)
    expect(menuOverlap([], ['Стрижка'])).toBe(0)
  })

  it('prefers the same menu and price level over a different one', () => {
    const salon = place('salon', { services: ['Окрашивание', 'Стрижка'], minPrice: 4000 })
    const nails = place('nails')
    expect(rankSimilarPlaces(place('target'), [salon, nails])).toEqual(['nails', 'salon'])
  })

  it('trusts a rating only as far as its reviews go', () => {
    const fewGreat = place('few', { rating: 5, reviewsCount: 1 })
    const manyGood = place('many', { rating: 4.8, reviewsCount: 60 })
    expect(rankSimilarPlaces(place('target'), [fewGreat, manyGood])).toEqual(['many', 'few'])
  })

  it('still ranks places without pins or prices', () => {
    const bare = place('bare', { pins: [], minPrice: null })
    expect(rankSimilarPlaces(place('target', { pins: [] }), [bare])).toEqual(['bare'])
  })
})
