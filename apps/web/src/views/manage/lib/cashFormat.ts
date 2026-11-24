import type { ExpenseCategory, FiscalReceipt, SalePaymentMethod } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'

import { t as plain } from '@/shared/i18n'

type Tr = (text: string, vars?: Record<string, string | number>) => string

const SALE_METHODS: { value: SalePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'transfer', label: 'Transfer' },
]

const METHOD_LABEL: Record<SalePaymentMethod, string> = {
  cash: 'cash',
  card: 'card',
  transfer: 'transfer',
}

/** The presets every business starts with; anything else is the owner's own word. */
const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'rent', label: 'Rent' },
  { value: 'materials', label: 'Materials' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
]

// «Карта» is the map elsewhere in the dictionary, so the card has its own key.
const saleMethodLabel = (method: SalePaymentMethod, t: Translate) =>
  t(SALE_METHODS.find((item) => item.value === method)?.label ?? method)

const expenseCategoryLabel = (category: ExpenseCategory, t: Tr = plain) => {
  const preset = EXPENSE_CATEGORIES.find((item) => item.value === category)
  return preset ? t(preset.label) : category
}

// Quantities may be fractional for some units; shown without trailing zeros.
const formatCount = (value: number) =>
  Number.isInteger(value)
    ? String(value)
    : value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })

/**
 * A receipt in a row's meta line: its number once issued, else what is happening to it. `isAlert`
 * paints it red: the provider refused it and somebody has to send it again.
 */
const describeReceipt = (receipt: FiscalReceipt, t: Tr = plain) => {
  if (receipt.status === 'failed') return { text: t('receipt failed'), isAlert: true }
  if (receipt.status === 'cancelled') return { text: t('receipt cancelled'), isAlert: false }
  if (receipt.status !== 'issued') {
    return {
      text: t(receipt.kind === 'refund' ? 'refund receipt on its way' : 'receipt on its way'),
      isAlert: false,
    }
  }
  return {
    text: t(receipt.kind === 'refund' ? 'refund receipt No. {number}' : 'receipt No. {number}', {
      number: receipt.fiscalNumber ?? '',
    }),
    isAlert: false,
  }
}

export {
  describeReceipt,
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  formatCount,
  METHOD_LABEL,
  SALE_METHODS,
  saleMethodLabel,
}
