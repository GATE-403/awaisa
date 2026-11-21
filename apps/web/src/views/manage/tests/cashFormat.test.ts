import { describe, expect, it } from 'vitest'
import type { FiscalReceipt } from '@/shared/api/types'
import {
  describeReceipt,
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  formatCount,
} from '../lib/cashFormat'

describe('cash desk wording', () => {
  it('names preset expense categories and keeps the owner’s own word as it is', () => {
    expect(expenseCategoryLabel('rent')).toBe('Аренда')
    expect(expenseCategoryLabel('materials')).toBe('Закупка материалов')
    expect(expenseCategoryLabel('Уборка')).toBe('Уборка')
    expect(EXPENSE_CATEGORIES.map((item) => item.value)).toEqual([
      'rent',
      'materials',
      'salaries',
      'utilities',
      'marketing',
      'other',
    ])
  })

  it('shows quantities without trailing zeros', () => {
    expect(formatCount(3)).toBe('3')
    expect(formatCount(2.5)).toBe('2,5')
  })
})

describe('describeReceipt', () => {
  const receipt = {
    kind: 'sale',
    status: 'issued',
    fiscalNumber: 'T-1A2B',
  } as FiscalReceipt

  it('names an issued receipt and its refund by number', () => {
    expect(describeReceipt(receipt)).toEqual({ text: 'чек №T-1A2B', isAlert: false })
    expect(describeReceipt({ ...receipt, kind: 'refund' })).toEqual({
      text: 'возврат чека №T-1A2B',
      isAlert: false,
    })
  })

  it('says a receipt is on its way, and flags one the provider refused', () => {
    expect(describeReceipt({ ...receipt, status: 'pending' }).text).toBe('чек отправляется')
    expect(describeReceipt({ ...receipt, status: 'sending', kind: 'refund' }).text).toBe(
      'возврат чека отправляется',
    )
    expect(describeReceipt({ ...receipt, status: 'failed' })).toEqual({
      text: 'чек не прошёл',
      isAlert: true,
    })
  })
})
