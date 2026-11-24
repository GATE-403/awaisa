import { buildSlots } from './availability.js'
import { mastersForAll, noMasterMessage, visitCost, visitLength } from './visit-services.js'

const manicure = { price: 1200, durationMinutes: 60 }
const pedicure = { price: 1500, durationMinutes: 90 }

describe('a visit of several services', () => {
  it('adds up length and price', () => {
    expect(visitLength([manicure, pedicure])).toBe(150)
    expect(visitCost([manicure, pedicure])).toBe(2700)
    expect(visitLength([])).toBe(0)
  })

  it('offers only masters who do every service, in the first list order', () => {
    const aida = { id: 'aida' }
    const bermet = { id: 'bermet' }
    const chynara = { id: 'chynara' }
    expect(
      mastersForAll([
        [aida, bermet, chynara],
        [chynara, aida],
      ]),
    ).toEqual([aida, chynara])
    expect(mastersForAll([[aida], [bermet]])).toEqual([])
    expect(mastersForAll([[bermet, aida]])).toEqual([bermet, aida])
  })

  it('names why nobody fits', () => {
    expect(noMasterMessage('any', true)).toBe('No specialist does all the chosen services')
    expect(noMasterMessage('m1', true)).toBe("This specialist doesn't do all the chosen services")
    expect(noMasterMessage('m1', false)).toBe("This specialist doesn't do the chosen service")
  })

  it('needs room for the whole visit: free time is counted on the total length', () => {
    const slots = (durationMinutes: number) =>
      buildSlots({
        dateKey: '2026-11-25',
        window: { opensMinutes: 10 * 60, closesMinutes: 14 * 60 },
        slotMinutes: 60,
        now: new Date('2026-11-20T00:00:00Z'),
        durationMinutes,
        specialistIds: ['m1'],
        // Busy 12:00-13:00 business time (UTC+6).
        busy: [
          {
            specialistId: 'm1',
            startsAt: new Date('2026-11-25T06:00:00Z'),
            endsAt: new Date('2026-11-25T07:00:00Z'),
          },
        ],
      })
        .filter((slot) => slot.isAvailable)
        .map((slot) => slot.time)

    expect(slots(manicure.durationMinutes)).toEqual(['10:00', '11:00', '13:00'])
    expect(slots(visitLength([manicure, pedicure]))).toEqual([])
    expect(slots(visitLength([manicure, manicure]))).toEqual(['10:00'])
  })
})
