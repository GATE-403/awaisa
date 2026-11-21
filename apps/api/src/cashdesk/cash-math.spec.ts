import { describe, expect, it } from 'vitest'
import {
  cashDifference,
  changeOf,
  expectedCash,
  profitOf,
  saleCost,
  saleTotal,
  shortages,
  stockDeltas,
} from './cash-math.js'

describe('expectedCash', () => {
  it('adds cash taken for visits and sales and the cash put in, minus what was taken out', () => {
    expect(
      expectedCash({
        openingCash: 5000,
        visitsCash: 7200,
        salesCash: 1300,
        cashIn: 500,
        cashOut: 2000,
      }),
    ).toBe(12000)
  })

  it('is the opening cash on a quiet shift', () => {
    expect(
      expectedCash({ openingCash: 3000, visitsCash: 0, salesCash: 0, cashIn: 0, cashOut: 0 }),
    ).toBe(3000)
  })

  it('keeps kopecks without floating point noise', () => {
    expect(
      expectedCash({ openingCash: 0.1, visitsCash: 0.2, salesCash: 0, cashIn: 0, cashOut: 0 }),
    ).toBe(0.3)
  })
})

describe('cashDifference', () => {
  it('is negative when the till is short and positive on a surplus', () => {
    expect(cashDifference(11800, 12000)).toBe(-200)
    expect(cashDifference(12050, 12000)).toBe(50)
    expect(cashDifference(12000, 12000)).toBe(0)
  })
})

describe('sales', () => {
  const lines = [
    { quantity: 2, price: 650, unitCost: 300 },
    { quantity: 1, price: 1200, unitCost: 700.5 },
  ]

  it('totals price and cost by quantity', () => {
    expect(saleTotal(lines)).toBe(2500)
    expect(saleCost(lines)).toBe(1300.5)
  })

  it('takes products off the shelf and an undo puts back exactly as much', () => {
    const items = [
      { itemId: 'a', quantity: 2 },
      { itemId: 'b', quantity: 1 },
      { itemId: 'a', quantity: 1 },
    ]
    const sold = stockDeltas(items, 'sell')
    const undone = stockDeltas(items, 'undo')
    expect(sold.get('a')).toBe(-3)
    expect(sold.get('b')).toBe(-1)
    for (const [itemId, delta] of sold) expect(delta + (undone.get(itemId) ?? 0)).toBe(0)
  })

  it('names the products there is not enough of, counting repeated lines together', () => {
    const stock = new Map([
      ['a', { name: 'Шампунь', quantity: 2 }],
      ['b', { name: 'Воск', quantity: 5 }],
    ])
    expect(
      shortages(
        [
          { itemId: 'a', quantity: 2 },
          { itemId: 'a', quantity: 1 },
          { itemId: 'b', quantity: 5 },
        ],
        stock,
      ),
    ).toEqual(['Шампунь'])
  })
})

describe('profit', () => {
  it('is revenue from services and products minus materials, products cost and expenses', () => {
    expect(
      profitOf({
        servicesRevenue: 100000,
        productsRevenue: 8000,
        materialsCost: 6000,
        productsCost: 4000,
        expenses: 50000,
      }),
    ).toBe(48000)
  })

  it('counts gift certificates bought online as revenue', () => {
    expect(
      profitOf({
        servicesRevenue: 10000,
        productsRevenue: 0,
        certificatesRevenue: 3000,
        materialsCost: 1000,
        productsCost: 0,
        expenses: 2000,
      }),
    ).toBe(10000)
  })

  it('goes below zero when expenses outweigh revenue', () => {
    expect(
      profitOf({
        servicesRevenue: 10000,
        productsRevenue: 0,
        materialsCost: 0,
        productsCost: 0,
        expenses: 40000,
      }),
    ).toBe(-30000)
  })

  it('compares with the previous period against its size, also from a loss', () => {
    expect(changeOf(120, 100)).toBe(20)
    expect(changeOf(-50, -100)).toBe(50)
    expect(changeOf(10, 0)).toBeNull()
  })
})
