import { describe, expect, it } from 'vitest'
import {
  buildReceipt,
  hasGivenUp,
  INN_PATTERN,
  nextAttemptDelayMs,
  planReceipts,
  toFiscalPayment,
  visitReceiptItems,
} from './receipt.js'

const VAT_PAYER = { isVatPayer: true, vatRate: 12, salesTaxServices: 2, salesTaxGoods: 1 }
const NOT_VAT_PAYER = { isVatPayer: false, vatRate: 12, salesTaxServices: 3, salesTaxGoods: 2 }

describe('buildReceipt', () => {
  it('takes VAT and the sales tax out of the price over one base', () => {
    const receipt = buildReceipt(
      [{ name: 'Haircut', kind: 'service', quantity: 1, price: 1140 }],
      'cash',
      VAT_PAYER,
    )
    // 1140 = 1000 × 1.14: VAT 120, sales tax 20.
    expect(receipt.lines[0]).toMatchObject({
      sum: 1140,
      vatRate: 12,
      vatAmount: 120,
      salesTaxRate: 2,
      salesTaxAmount: 20,
    })
    expect(receipt).toMatchObject({
      total: 1140,
      vatAmount: 120,
      salesTaxAmount: 20,
      payment: 'cash',
    })
  })

  it('uses the goods rate for products and no VAT for a business that does not pay it', () => {
    const receipt = buildReceipt(
      [
        { name: 'Shampoo', kind: 'goods', quantity: 2, price: 510 },
        { name: 'Mask', kind: 'goods', quantity: 1, price: 0 },
      ],
      'card',
      NOT_VAT_PAYER,
    )
    expect(receipt.lines).toHaveLength(1)
    expect(receipt.lines[0]).toMatchObject({
      sum: 1020,
      vatAmount: 0,
      salesTaxRate: 2,
      salesTaxAmount: 20,
    })
    expect(receipt.payment).toBe('cashless')
  })

  it('rounds to tyiyns', () => {
    const receipt = buildReceipt(
      [{ name: 'Styling', kind: 'service', quantity: 1, price: 999 }],
      'transfer',
      VAT_PAYER,
    )
    expect(receipt.vatAmount).toBe(105.16)
    expect(receipt.salesTaxAmount).toBe(17.53)
  })
})

describe('toFiscalPayment', () => {
  it('counts card and transfer as cashless', () => {
    expect(toFiscalPayment('cash')).toBe('cash')
    expect(toFiscalPayment('card')).toBe('cashless')
    expect(toFiscalPayment('transfer')).toBe('cashless')
  })
})

describe('visitReceiptItems', () => {
  const visit = {
    outcome: 'arrived' as const,
    paidAmount: 1500,
    paymentMethod: 'card',
    serviceName: 'Manicure',
  }

  it('turns the money paid into one service line', () => {
    expect(visitReceiptItems(visit)).toEqual({
      items: [{ name: 'Manicure', kind: 'service', quantity: 1, price: 1500 }],
      method: 'card',
    })
  })

  it('needs no receipt without money taken', () => {
    expect(visitReceiptItems({ ...visit, outcome: 'no_show' })).toBeNull()
    expect(visitReceiptItems({ ...visit, outcome: null })).toBeNull()
    expect(visitReceiptItems({ ...visit, paidAmount: 0 })).toBeNull()
    expect(visitReceiptItems({ ...visit, paymentMethod: 'subscription' })).toBeNull()
    expect(visitReceiptItems({ ...visit, paymentMethod: 'certificate' })).toBeNull()
  })
})

describe('planReceipts', () => {
  const wanted = buildReceipt(
    [{ name: 'Manicure', kind: 'service', quantity: 1, price: 1500 }],
    'cash',
    VAT_PAYER,
  )

  it('issues the first receipt', () => {
    expect(planReceipts(null, wanted)).toEqual({ cancel: [], refund: [], issue: true })
  })

  it('keeps a receipt that still matches', () => {
    const active = { id: 'a', status: 'issued' as const, total: 1500, payment: 'cash' as const }
    expect(planReceipts(active, wanted)).toEqual({ cancel: [], refund: [], issue: false })
  })

  it('refunds a sent receipt and issues anew when the amount or the form changes', () => {
    const active = { id: 'a', status: 'issued' as const, total: 1500, payment: 'cashless' as const }
    expect(planReceipts(active, wanted)).toEqual({ cancel: [], refund: ['a'], issue: true })
  })

  it('drops a receipt not sent yet instead of refunding it', () => {
    const active = { id: 'a', status: 'pending' as const, total: 1200, payment: 'cash' as const }
    expect(planReceipts(active, null)).toEqual({ cancel: ['a'], refund: [], issue: false })
    expect(planReceipts({ ...active, status: 'failed' }, wanted)).toEqual({
      cancel: ['a'],
      refund: [],
      issue: true,
    })
  })

  it('refunds a receipt out to the provider now, which may come back issued', () => {
    const active = { id: 'a', status: 'sending' as const, total: 1500, payment: 'cash' as const }
    expect(planReceipts(active, null)).toEqual({ cancel: [], refund: ['a'], issue: false })
  })

  it('refunds a sent receipt when nothing is paid any more', () => {
    const active = { id: 'a', status: 'issued' as const, total: 1500, payment: 'cash' as const }
    expect(planReceipts(active, null)).toEqual({ cancel: [], refund: ['a'], issue: false })
  })
})

describe('retries', () => {
  it('waits longer after each failure, an hour at most', () => {
    expect(nextAttemptDelayMs(1)).toBe(60_000)
    expect(nextAttemptDelayMs(3)).toBe(4 * 60_000)
    expect(nextAttemptDelayMs(12)).toBe(60 * 60_000)
  })

  it('gives up after twenty tries', () => {
    expect(hasGivenUp(19)).toBe(false)
    expect(hasGivenUp(20)).toBe(true)
  })
})

describe('INN_PATTERN', () => {
  it('takes fourteen digits only', () => {
    expect(INN_PATTERN.test('01234567890123')).toBe(true)
    expect(INN_PATTERN.test('0123456789012')).toBe(false)
    expect(INN_PATTERN.test('0123456789012a')).toBe(false)
  })
})
