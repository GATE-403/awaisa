import { toPlace, toPlaces } from './photon.js'

describe('Photon places', () => {
  it('reads a house as street and number with the district and city under it', () => {
    expect(
      toPlace({
        geometry: { coordinates: [74.6012345678, 42.8701234567] },
        properties: {
          name: 'Киевская улица',
          street: 'Киевская улица',
          housenumber: '77',
          district: 'Первомайский район',
          city: 'Бишкек',
          osm_key: 'building',
        },
      }),
    ).toEqual({
      address: 'Киевская улица, 77',
      area: 'Первомайский район, Бишкек',
      latitude: 42.870123,
      longitude: 74.601235,
    })
  })

  it('leads with a named building, and keeps a street alone as its name', () => {
    expect(
      toPlace({
        geometry: { coordinates: [74.59, 42.87] },
        properties: {
          name: 'Bishkek Park',
          street: 'проспект Чуй',
          housenumber: '155',
          city: 'Бишкек',
          osm_key: 'shop',
        },
      })?.address,
    ).toBe('Bishkek Park, проспект Чуй, 155')
    expect(
      toPlace({
        geometry: { coordinates: [74.59, 42.87] },
        properties: { name: 'проспект Манаса', osm_key: 'highway', city: 'Бишкек' },
      })?.address,
    ).toBe('проспект Манаса')
  })

  it('drops features without a point or a name and repeats of one address', () => {
    expect(toPlace({ properties: { name: 'X' } })).toBeNull()
    expect(toPlace({ geometry: { coordinates: [74, 42] }, properties: {} })).toBeNull()
    const house = {
      geometry: { coordinates: [74, 42] as [number, number] },
      properties: { street: 'Токтогула', housenumber: '125' },
    }
    expect(toPlaces([house, house])).toHaveLength(1)
  })
})
