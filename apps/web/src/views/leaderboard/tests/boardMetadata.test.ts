import { describe, expect, it } from 'vitest'
import { boardMetadata } from '../lib/boardMetadata'

describe('boardMetadata', () => {
  it('names the default board barbers with a bare canonical', () => {
    const metadata = boardMetadata({})
    expect(metadata.title).toEqual({ absolute: 'Top barbers in Bishkek: ranked by reviews' })
    expect(metadata.alternates?.canonical).toBe('/top')
  })

  it('gives every kind and view its own canonical', () => {
    const metadata = boardMetadata({ kind: 'nails', view: 'places' })
    expect(metadata.title).toEqual({
      absolute: 'Top nail studios in Bishkek: ranked by reviews',
    })
    expect(metadata.alternates?.canonical).toBe('/top?view=places&kind=nails')
  })

  it('reads an unknown kind as the default board', () => {
    expect(boardMetadata({ kind: 'nope' }).alternates?.canonical).toBe('/top')
  })
})
