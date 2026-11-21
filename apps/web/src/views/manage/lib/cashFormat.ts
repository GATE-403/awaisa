import type { ExpenseCategory, SalePaymentMethod } from '@/shared/api/types'

const SALE_METHODS: { value: SalePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Карта' },
  { value: 'transfer', label: 'Перевод' },
]

const METHOD_LABEL: Record<SalePaymentMethod, string> = {
  cash: 'наличные',
  card: 'карта',
  transfer: 'перевод',
}

/** The presets every business starts with; anything else is the owner's own word. */
const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'rent', label: 'Аренда' },
  { value: 'materials', label: 'Закупка материалов' },
  { value: 'salaries', label: 'Зарплаты' },
  { value: 'utilities', label: 'Коммунальные' },
  { value: 'marketing', label: 'Реклама' },
  { value: 'other', label: 'Прочее' },
]

const expenseCategoryLabel = (category: ExpenseCategory) =>
  EXPENSE_CATEGORIES.find((item) => item.value === category)?.label ?? category

// Quantities may be fractional for some units; shown without trailing zeros.
const formatCount = (value: number) =>
  Number.isInteger(value)
    ? String(value)
    : value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })

export { EXPENSE_CATEGORIES, expenseCategoryLabel, formatCount, METHOD_LABEL, SALE_METHODS }
