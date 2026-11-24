// What goes on a fiscal receipt, kept pure so it is unit-tested: the lines with their taxes,
// the total, the payment form, and what a visit's receipt should be after staff mark it.
// Kyrgyzstan prices include VAT and the sales tax (НсП): both are taken out of the line's sum
// over one base, sum = base × (1 + VAT + НсП), so their parts add back to the price.

type FiscalLineKind = 'service' | 'goods'

type FiscalPayment = 'cash' | 'cashless'

type FiscalTaxes = {
  isVatPayer: boolean
  /** Percent, 12 in Kyrgyzstan. Ignored when the business does not pay VAT. */
  vatRate: number
  /** Percent of the sales tax on services and on goods (НК КР ст. 368). */
  salesTaxServices: number
  salesTaxGoods: number
}

type ReceiptItem = { name: string; kind: FiscalLineKind; quantity: number; price: number }

type FiscalLine = ReceiptItem & {
  sum: number
  vatRate: number
  vatAmount: number
  salesTaxRate: number
  salesTaxAmount: number
}

type FiscalDocument = {
  lines: FiscalLine[]
  total: number
  vatAmount: number
  salesTaxAmount: number
  payment: FiscalPayment
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

/** Card and transfer are both cashless on a receipt; only notes and coins are cash. */
const toFiscalPayment = (method: string): FiscalPayment => (method === 'cash' ? 'cash' : 'cashless')

const lineTaxes = (sum: number, kind: FiscalLineKind, taxes: FiscalTaxes) => {
  const vatRate = taxes.isVatPayer ? taxes.vatRate : 0
  const salesTaxRate = kind === 'goods' ? taxes.salesTaxGoods : taxes.salesTaxServices
  const base = sum / (1 + (vatRate + salesTaxRate) / 100)
  return {
    vatRate,
    vatAmount: roundMoney((base * vatRate) / 100),
    salesTaxRate,
    salesTaxAmount: roundMoney((base * salesTaxRate) / 100),
  }
}

/** A sale receipt for these items; a refund receipt carries the same lines. */
const buildReceipt = (items: ReceiptItem[], method: string, taxes: FiscalTaxes): FiscalDocument => {
  const lines = items
    .filter((item) => item.quantity > 0 && item.price > 0)
    .map((item) => {
      const sum = roundMoney(item.quantity * item.price)
      return { ...item, sum, ...lineTaxes(sum, item.kind, taxes) }
    })
  return {
    lines,
    total: roundMoney(lines.reduce((total, line) => total + line.sum, 0)),
    vatAmount: roundMoney(lines.reduce((total, line) => total + line.vatAmount, 0)),
    salesTaxAmount: roundMoney(lines.reduce((total, line) => total + line.salesTaxAmount, 0)),
    payment: toFiscalPayment(method),
  }
}

type VisitPayment = {
  outcome: 'arrived' | 'no_show' | null
  paidAmount: number | null
  paymentMethod: string | null
  serviceName: string
}

/**
 * The receipt a visit needs: money paid at an arrived visit. Subscriptions, certificates and
 * bonuses are not money taken now, so a visit they paid whole needs none.
 */
const visitReceiptItems = (
  visit: VisitPayment,
): { items: ReceiptItem[]; method: string } | null => {
  const isMoney =
    visit.paymentMethod === 'cash' ||
    visit.paymentMethod === 'card' ||
    visit.paymentMethod === 'transfer'
  if (visit.outcome !== 'arrived' || !isMoney || !visit.paidAmount || visit.paidAmount <= 0) {
    return null
  }
  return {
    items: [{ name: visit.serviceName, kind: 'service', quantity: 1, price: visit.paidAmount }],
    method: visit.paymentMethod as string,
  }
}

type ActiveReceipt = {
  id: string
  /** `sending` is out to the provider now: it may come back issued, so it is refunded too. */
  status: 'pending' | 'sending' | 'issued' | 'failed'
  total: number
  payment: FiscalPayment
}

type ReceiptPlan = {
  /** Receipts not sent yet that are no longer wanted: dropped, nothing reaches the tax office. */
  cancel: string[]
  /** Sent receipts that no longer match what was paid: each gets a refund receipt. */
  refund: string[]
  /** A new sale receipt to issue. */
  issue: boolean
}

/**
 * What to do when what was paid changes (a visit re-marked, a sale cancelled): keep a receipt
 * that still matches, refund one already sent and drop one still waiting, then issue anew.
 */
const planReceipts = (active: ActiveReceipt | null, wanted: FiscalDocument | null): ReceiptPlan => {
  const isSame =
    active !== null &&
    wanted !== null &&
    active.total === wanted.total &&
    active.payment === wanted.payment
  if (isSame) return { cancel: [], refund: [], issue: false }
  const plan: ReceiptPlan = { cancel: [], refund: [], issue: wanted !== null && wanted.total > 0 }
  if (active?.status === 'issued' || active?.status === 'sending') plan.refund.push(active.id)
  else if (active) plan.cancel.push(active.id)
  return plan
}

const RETRY_BASE_MINUTES = 1
const RETRY_MAX_MINUTES = 60
const MAX_ATTEMPTS = 20

/** When to try again after a failed send: 1, 2, 4 … minutes, an hour at most. */
const nextAttemptDelayMs = (attempts: number) =>
  Math.min(RETRY_BASE_MINUTES * 2 ** Math.max(attempts - 1, 0), RETRY_MAX_MINUTES) * 60_000

/** A provider that keeps refusing stops being asked; the owner can send it again by hand. */
const hasGivenUp = (attempts: number) => attempts >= MAX_ATTEMPTS

// Kyrgyz TIN (ИНН): 14 digits, for people and companies alike.
const INN_PATTERN = /^\d{14}$/

export type {
  ActiveReceipt,
  FiscalDocument,
  FiscalLine,
  FiscalLineKind,
  FiscalPayment,
  FiscalTaxes,
  ReceiptItem,
  ReceiptPlan,
  VisitPayment,
}
export {
  buildReceipt,
  hasGivenUp,
  INN_PATTERN,
  MAX_ATTEMPTS,
  nextAttemptDelayMs,
  planReceipts,
  toFiscalPayment,
  visitReceiptItems,
}
