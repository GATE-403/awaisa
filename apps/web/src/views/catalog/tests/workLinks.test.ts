import { describe, expect, it } from 'vitest'
import { workFeedHref, workLookHref } from '../lib/workLinks'

const business = { slug: 'kings', name: 'Kings', kind: 'barber' as const, address: '' }

describe('workLinks', () => {
  it('opens «Образы» on the work, within the catalog kind', () => {
    expect(workFeedHref({ id: 'p1' }, 'barber')).toBe('/feed?start=p1&kind=barber')
    expect(workFeedHref({ id: 'p1' }, undefined)).toBe('/feed?start=p1')
  })

  it('books the same service with the same master and hands the photo over', () => {
    const href = workLookHref({
      id: 'p1',
      business,
      service: { id: 's1', name: 'Стрижка', price: 900, durationMinutes: 45 },
      specialist: { id: 'm1', name: 'Нурсултан', photoUrl: null },
    })
    expect(href).toBe('/kings/book?service=s1&specialist=m1&look=p1')
  })

  it('still carries the look when the work is not tagged', () => {
    expect(workLookHref({ id: 'p1', business, service: null, specialist: null })).toBe(
      '/kings/book?look=p1',
    )
  })
})
