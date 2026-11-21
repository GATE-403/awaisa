import { describe, expect, it } from 'vitest'
import { EXPENSE_CATEGORIES, expenseCategoryLabel, formatCount } from '../lib/cashFormat'

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
