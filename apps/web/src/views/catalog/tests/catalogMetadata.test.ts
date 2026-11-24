import { describe, expect, it } from 'vitest'
import { catalogMetadata } from '../lib/catalogMetadata'

describe('catalogMetadata', () => {
  it('indexes the home page under its own canonical', () => {
    const metadata = catalogMetadata({})
    expect(metadata.alternates?.canonical).toBe('/')
    expect(metadata.robots).toBeUndefined()
  })

  it('gives each kind its own title and canonical', () => {
    const metadata = catalogMetadata({ kind: 'barber' })
    expect(metadata.title).toEqual({
      absolute: 'Barbershops in Bishkek: prices and online booking',
    })
    expect(metadata.alternates?.canonical).toBe('/?kind=barber')
    expect(metadata.robots).toBeUndefined()
  })

  it('points a sorted page back to the page it sorts', () => {
    const metadata = catalogMetadata({ kind: 'nails', sort: 'price' })
    expect(metadata.alternates?.canonical).toBe('/?kind=nails')
  })

  it('keeps searches out of the index but lets links be followed', () => {
    const metadata = catalogMetadata({ q: 'haircut', kind: 'barber' })
    expect(metadata.robots).toEqual({ index: false, follow: true })
    expect(metadata.alternates?.canonical).toBe('/?kind=barber')
  })

  it('does not index «Other» or an unknown kind as landings', () => {
    expect(catalogMetadata({ kind: 'other' }).robots).toEqual({ index: false, follow: true })
    expect(catalogMetadata({ kind: 'other' }).alternates?.canonical).toBe('/')
    expect(catalogMetadata({ kind: 'nope' }).alternates?.canonical).toBe('/')
    expect(catalogMetadata({ kind: 'nope' }).robots).toBeUndefined()
  })
})
