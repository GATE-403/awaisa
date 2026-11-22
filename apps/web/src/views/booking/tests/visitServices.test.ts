import { describe, expect, it } from 'vitest'
import type { Service } from '@/shared/api/types'
import {
  combineServices,
  getAddableServices,
  getMastersForAll,
  pickOfferedService,
} from '../lib/visitServices'

const service = (
  id: string,
  price: number,
  durationMinutes: number,
  deposit?: number,
): Service => ({
  id,
  categoryId: 'nails',
  name: id,
  description: '',
  price,
  durationMinutes,
  deposit: deposit ?? null,
  isPopular: false,
})

const manicure = service('Маникюр', 1200, 60, 300)
const pedicure = service('Педикюр', 1500, 90)
const brows = service('Брови', 800, 30)
const masters = [
  { id: 'aida', serviceIds: ['Маникюр', 'Педикюр'], branchId: null },
  { id: 'bermet', serviceIds: ['Маникюр', 'Брови'], branchId: 'south' },
]

describe('a visit of several services', () => {
  it('reads as one service: names joined, price, length and deposit added up', () => {
    expect(combineServices([manicure, pedicure])).toMatchObject({
      id: 'Маникюр',
      name: 'Маникюр + Педикюр',
      price: 2700,
      durationMinutes: 150,
      deposit: 300,
    })
    expect(combineServices([manicure])).toBe(manicure)
    expect(combineServices([])).toBeUndefined()
  })

  it('offers only masters who do every chosen service, in the branch', () => {
    expect(getMastersForAll(masters, ['Маникюр']).map((master) => master.id)).toEqual([
      'aida',
      'bermet',
    ])
    expect(getMastersForAll(masters, ['Маникюр', 'Педикюр']).map((master) => master.id)).toEqual([
      'aida',
    ])
    expect(getMastersForAll(masters, ['Маникюр'], 'north').map((master) => master.id)).toEqual([
      'aida',
    ])
  })

  it('adds only services someone does together with the chosen ones', () => {
    const all = [manicure, pedicure, brows]
    const addable = (specialistId: string | null) =>
      getAddableServices({ services: all, masters, chosenIds: ['Маникюр'], specialistId }).map(
        (item) => item.id,
      )
    expect(addable(null)).toEqual(['Педикюр', 'Брови'])
    expect(addable('aida')).toEqual(['Педикюр'])
    expect(addable('any')).toEqual(['Педикюр', 'Брови'])
    expect(
      getAddableServices({
        services: all,
        masters,
        chosenIds: ['Маникюр', 'Педикюр'],
        specialistId: null,
      }),
    ).toEqual([])
  })
})

describe('the service offered for the visit', () => {
  it('offers what the place sells most first', () => {
    const popular = { ...brows, isPopular: true }
    expect(pickOfferedService([pedicure, popular], 'nails')).toBe(popular)
  })

  it('then the same kind as the first service, then the menu order', () => {
    const hair = { ...service('Стрижка', 900, 45), categoryId: 'hair' }
    expect(pickOfferedService([hair, pedicure], 'nails')).toBe(pedicure)
    expect(pickOfferedService([pedicure, brows], 'nails')).toBe(pedicure)
  })

  it('offers nothing when nothing can join', () => {
    expect(pickOfferedService([], 'nails')).toBeUndefined()
  })
})
