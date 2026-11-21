// The money math of the counter, kept pure so it is unit-tested: what should be in the till,
// what a sale costs and takes off the shelf, and the profit.

type ShiftCash = {
  openingCash: number
  visitsCash: number
  salesCash: number
  cashIn: number
  cashOut: number
}

type SaleLine = { quantity: number; price: number; unitCost: number }

type ProfitParts = {
  servicesRevenue: number
  productsRevenue: number
  /** Gift certificates paid online (optional: older callers have none). */
  certificatesRevenue?: number
  materialsCost: number
  productsCost: number
  expenses: number
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

/** What the till should hold: the counted start, the cash taken in, minus what was taken out. */
const expectedCash = (shift: ShiftCash) =>
  roundMoney(shift.openingCash + shift.visitsCash + shift.salesCash + shift.cashIn - shift.cashOut)

/** Counted minus expected: below zero the till is short, above zero there is a surplus. */
const cashDifference = (counted: number, expected: number) => roundMoney(counted - expected)

const saleTotal = (lines: SaleLine[]) =>
  roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.price, 0))

const saleCost = (lines: SaleLine[]) =>
  roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0))

/**
 * How a sale moves the shelf: each product goes down by what was sold; undoing the sale moves
 * it back by the same amount, so a sale and its undo always leave the stock as it was.
 */
const stockDeltas = (lines: { itemId: string; quantity: number }[], direction: 'sell' | 'undo') => {
  const deltas = new Map<string, number>()
  for (const line of lines) {
    const sign = direction === 'sell' ? -1 : 1
    deltas.set(line.itemId, roundMoney((deltas.get(line.itemId) ?? 0) + sign * line.quantity))
  }
  return deltas
}

/** Lines asking for more than is on the shelf (names only, for the error). */
const shortages = (
  lines: { itemId: string; quantity: number }[],
  stock: Map<string, { name: string; quantity: number }>,
) => {
  const wanted = stockDeltas(lines, 'undo')
  return [...wanted.entries()]
    .filter(([itemId, quantity]) => (stock.get(itemId)?.quantity ?? 0) < quantity)
    .map(([itemId]) => stock.get(itemId)?.name ?? itemId)
}

const profitOf = (parts: ProfitParts) =>
  roundMoney(
    parts.servicesRevenue +
      parts.productsRevenue +
      (parts.certificatesRevenue ?? 0) -
      parts.materialsCost -
      parts.productsCost -
      parts.expenses,
  )

const changeOf = (current: number, previous: number) =>
  previous === 0 ? null : Math.round(((current - previous) / Math.abs(previous)) * 100)

export type { ProfitParts, SaleLine, ShiftCash }
export {
  cashDifference,
  changeOf,
  expectedCash,
  profitOf,
  roundMoney,
  saleCost,
  saleTotal,
  shortages,
  stockDeltas,
}
