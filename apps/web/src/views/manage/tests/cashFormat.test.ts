import { describe, expect, it } from 'vitest'
import type { FiscalReceipt } from '@/shared/api/types'
import { makeFormat } from '@/shared/i18n/format'
import {
  describeReceipt,
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  formatCount,
} from '../lib/cashFormat'
import { i18n, t } from './translator'

describe('cash desk wording', () => {
  it('names preset expense categories and keeps the owner’s own word as it is', () => {
    expect(expenseCategoryLabel('rent', t)).toBe('Rent')
    expect(expenseCategoryLabel('materials', t)).toBe('Materials')
    expect(expenseCategoryLabel('Cleaning', t)).toBe('Cleaning')
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
    const format = makeFormat(i18n)
    expect(formatCount(format, 3)).toBe('3')
    expect(formatCount(format, 2.5)).toBe('2.5')
    expect(formatCount(format, 1.333)).toBe('1.33')
  })
})

describe('describeReceipt', () => {
  const receipt = {
    kind: 'sale',
    status: 'issued',
    fiscalNumber: 'T-1A2B',
  } as FiscalReceipt

  it('names an issued receipt and its refund by number', () => {
    expect(describeReceipt(receipt, t)).toEqual({ text: 'receipt No. T-1A2B', isAlert: false })
    expect(describeReceipt({ ...receipt, kind: 'refund' }, t)).toEqual({
      text: 'refund receipt No. T-1A2B',
      isAlert: false,
    })
  })

  it('says a receipt is on its way, and flags one the provider refused', () => {
    expect(describeReceipt({ ...receipt, status: 'pending' }, t).text).toBe('receipt on its way')
    expect(describeReceipt({ ...receipt, status: 'sending', kind: 'refund' }, t).text).toBe(
      'refund receipt on its way',
    )
    expect(describeReceipt({ ...receipt, status: 'failed' }, t)).toEqual({
      text: 'receipt failed',
      isAlert: true,
    })
  })
})
