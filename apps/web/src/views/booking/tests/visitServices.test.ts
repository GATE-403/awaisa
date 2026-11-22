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
  const hair = (name: string, categoryId = 'hair') => ({
    ...service(name, 900, 45),
    categoryId,
  })
  const haircut = hair('Женская стрижка')
  const kidsCut = hair('Детская стрижка')
  const toning = hair('Тонирование', 'colour')
  const styling = hair('Укладка')

  it('offers an add-on, not the same kind: another category when the menu has several', () => {
    const menu = [haircut, kidsCut, styling, toning]
    expect(pickOfferedService([kidsCut, styling, toning], [haircut], menu)).toBe(toning)
  })

  it('never offers the same thing under another name', () => {
    const massage = { ...service('Классический массаж', 2500, 60), categoryId: 'all' }
    const back = { ...service('Массаж спины', 1300, 30), categoryId: 'all' }
    const stones = { ...service('Стоун-терапия', 3500, 90), categoryId: 'all' }
    expect(pickOfferedService([back, stones], [massage], [massage, back, stones])).toBe(stones)
    expect(pickOfferedService([back], [massage], [massage, back])).toBeUndefined()
  })

  it('reads only what a service is, not the words that describe it', () => {
    const nails = { ...service('Маникюр с покрытием', 1200, 60), categoryId: 'all' }
    const feet = { ...service('Педикюр с покрытием', 1500, 90), categoryId: 'all' }
    const again = { ...service('Маникюр классический', 900, 45), categoryId: 'all' }
    expect(pickOfferedService([again, feet], [nails], [nails, again, feet])).toBe(feet)
  })

  it('with one category reads names only, popular first, then the menu order', () => {
    const popularBrows = { ...brows, isPopular: true }
    const menu = [manicure, pedicure, popularBrows]
    expect(pickOfferedService([pedicure, popularBrows], [manicure], menu)).toBe(popularBrows)
    expect(pickOfferedService([pedicure, brows], [manicure], [manicure, pedicure, brows])).toBe(
      pedicure,
    )
  })

  it('offers nothing when nothing can join', () => {
    expect(pickOfferedService([], [manicure], [manicure])).toBeUndefined()
  })
})
