import type { MasterPayScheme } from '@awaisa/contracts'
import { describe, expect, it } from 'vitest'
import { calculatePay, countWorkDays, daysBetween, hasScheme } from './payroll.js'

const scheme = (parts: Partial<MasterPayScheme>): MasterPayScheme => ({
  percent: null,
  rates: [],
  salary: null,
  minimum: null,
  productsPercent: null,
  ...parts,
})

const cut = { serviceId: 'cut', serviceName: 'Стрижка', earned: 1000 }
const beard = { serviceId: 'beard', serviceName: 'Борода', earned: 500 }
const november = daysBetween('2026-11-01', '2026-11-30')

describe('calculatePay', () => {
  it('adds the percent of the products the master sold to the services', () => {
    const pay = calculatePay({
      scheme: scheme({ percent: 40, productsPercent: 10 }),
      visits: [cut],
      productsSold: 2_550,
      days: november,
      workDays: 0,
    })
    expect(pay.services).toBe(400)
    expect(pay.products).toBe(255)
    expect(pay.productsSold).toBe(2_550)
    expect(pay.earned).toBe(655)
    expect(pay.total).toBe(655)
  })

  it('pays nothing for products without a products percent, and counts them toward the minimum', () => {
    const none = calculatePay({
      scheme: scheme({ percent: 40 }),
      visits: [],
      productsSold: 5_000,
      days: november,
      workDays: 0,
    })
    expect(none.products).toBe(0)
    expect(none.productsSold).toBe(5_000)
    const withMinimum = calculatePay({
      scheme: scheme({ productsPercent: 20, minimum: 3_000 }),
      visits: [],
      productsSold: 20_000,
      days: november,
      workDays: 0,
    })
    expect(withMinimum.total).toBe(4_000)
  })

  it('takes the percent of what the visits earned, rounded once', () => {
    const pay = calculatePay({
      scheme: scheme({ percent: 40 }),
      visits: [cut, { ...cut, earned: 1333 }, beard],
      days: november,
      workDays: 0,
    })
    expect(pay.services).toBe(Math.round(2833 * 0.4))
    expect(pay.total).toBe(pay.services)
    expect(pay.lines.map((line) => [line.serviceId, line.visits, line.base])).toEqual([
      ['cut', 2, 2333],
      ['beard', 1, 500],
    ])
  })

  it('uses a service rate over the master percent: another percent or a fixed sum', () => {
    const pay = calculatePay({
      scheme: scheme({
        percent: 40,
        rates: [
          { serviceId: 'beard', kind: 'fixed', value: 300 },
          { serviceId: 'cut', kind: 'percent', value: 50 },
        ],
      }),
      visits: [cut, cut, beard, beard],
      days: november,
      workDays: 0,
    })
    expect(pay.lines).toEqual([
      {
        serviceId: 'cut',
        name: 'Стрижка',
        visits: 2,
        base: 2000,
        kind: 'percent',
        rate: 50,
        amount: 1000,
      },
      {
        serviceId: 'beard',
        name: 'Борода',
        visits: 2,
        base: 1000,
        kind: 'fixed',
        rate: 300,
        amount: 600,
      },
    ])
    expect(pay.services).toBe(1600)
  })

  it('pays nothing for services without any rate', () => {
    const pay = calculatePay({
      scheme: scheme({ rates: [{ serviceId: 'cut', kind: 'percent', value: 10 }] }),
      visits: [cut, beard],
      days: november,
      workDays: 0,
    })
    expect(pay.services).toBe(100)
    expect(pay.lines.find((line) => line.serviceId === 'beard')).toMatchObject({
      kind: null,
      rate: null,
      amount: 0,
    })
  })

  it('adds a monthly salary by calendar days: a whole month is the whole sum', () => {
    const month = calculatePay({
      scheme: scheme({ percent: 10, salary: { kind: 'month', amount: 30_000 } }),
      visits: [cut],
      days: november,
      workDays: 0,
    })
    expect(month.salary).toBe(30_000)
    expect(month.earned).toBe(30_100)

    // Ten days of November (30 days) and five of December (31 days).
    const spanning = calculatePay({
      scheme: scheme({ salary: { kind: 'month', amount: 31_000 } }),
      visits: [],
      days: daysBetween('2026-11-21', '2026-12-05'),
      workDays: 0,
    })
    expect(spanning.salary).toBe(Math.round((31_000 / 30) * 10 + (31_000 / 31) * 5))
  })

  it('pays a daily salary per working day', () => {
    const pay = calculatePay({
      scheme: scheme({ salary: { kind: 'day', amount: 1500 } }),
      visits: [],
      days: november,
      workDays: 22,
    })
    expect(pay.salary).toBe(33_000)
    expect(pay.workDays).toBe(22)
  })

  it('pays the minimum when the earned amount is below it, else the earned', () => {
    const low = calculatePay({
      scheme: scheme({ percent: 40, minimum: 20_000 }),
      visits: [cut],
      days: november,
      workDays: 0,
    })
    expect(low.earned).toBe(400)
    expect(low.minimum).toBe(20_000)
    expect(low.total).toBe(20_000)

    const high = calculatePay({
      scheme: scheme({ percent: 40, minimum: 100 }),
      visits: [cut],
      days: daysBetween('2026-11-01', '2026-11-15'),
      workDays: 0,
    })
    expect(high.minimum).toBe(50)
    expect(high.total).toBe(400)
  })

  it('is zero without a scheme', () => {
    const pay = calculatePay({ scheme: scheme({}), visits: [cut], days: november, workDays: 20 })
    expect(pay.total).toBe(0)
    expect(hasScheme(scheme({}))).toBe(false)
    expect(hasScheme(scheme({ minimum: 0 }))).toBe(true)
    expect(hasScheme(scheme({ productsPercent: 5 }))).toBe(true)
  })
})

describe('countWorkDays', () => {
  const week = daysBetween('2026-11-16', '2026-11-22') // Monday to Sunday

  it('counts the business week when the master has no own hours', () => {
    expect(
      countWorkDays(week, {
        businessWeekdays: new Set([0, 1, 2, 3, 4, 5]),
        ownWeekdays: null,
        leaves: [],
      }),
    ).toBe(6)
  })

  it('uses the own week and skips days away', () => {
    expect(
      countWorkDays(week, {
        businessWeekdays: new Set([0, 1, 2, 3, 4, 5, 6]),
        ownWeekdays: new Set([0, 2, 4]),
        leaves: [{ startsOn: '2026-11-18', endsOn: '2026-11-19' }],
      }),
    ).toBe(2)
  })
})

describe('daysBetween', () => {
  it('lists both ends and crosses months', () => {
    expect(daysBetween('2026-11-29', '2026-12-02')).toEqual([
      '2026-11-29',
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
    ])
    expect(daysBetween('2026-11-02', '2026-11-01')).toEqual([])
  })
})
