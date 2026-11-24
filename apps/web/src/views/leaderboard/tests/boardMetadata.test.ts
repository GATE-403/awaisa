import { setupI18n } from '@lingui/core'
import { describe, expect, it } from 'vitest'
import { boardMetadata } from '../lib/boardMetadata'

// No catalog: every message falls back to its English source.
const i18n = setupI18n({ locale: 'en', messages: { en: {} } })

describe('boardMetadata', () => {
  it('names the default board barbers with a bare canonical', () => {
    const metadata = boardMetadata({}, i18n)
    expect(metadata.title).toEqual({ absolute: 'Top barbers in Bishkek: ranked by reviews' })
    expect(metadata.alternates?.canonical).toBe('/top')
  })

  it('gives every kind and view its own canonical', () => {
    const metadata = boardMetadata({ kind: 'nails', view: 'places' }, i18n)
    expect(metadata.title).toEqual({
      absolute: 'Top nail studios in Bishkek: ranked by reviews',
    })
    expect(metadata.alternates?.canonical).toBe('/top?view=places&kind=nails')
  })

  it('reads an unknown kind as the default board', () => {
    expect(boardMetadata({ kind: 'nope' }, i18n).alternates?.canonical).toBe('/top')
  })
})
