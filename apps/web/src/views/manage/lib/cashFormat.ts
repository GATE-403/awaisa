import type { ExpenseCategory, FiscalReceipt, SalePaymentMethod } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'

type Vars = Record<string, string | number>
type Tr = (text: string, vars?: Vars) => string

// Russian as it is: callers without a translator (and the unit tests) read the keys filled in.
const russian: Tr = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, key: string) => String(vars[key] ?? match)) : text

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

// «Карта» is the map elsewhere in the dictionary, so the card has its own key.
const saleMethodLabel = (method: SalePaymentMethod, t: Translate) =>
  method === 'card' && t.language !== 'ru'
    ? t('Карта (оплата)')
    : t(SALE_METHODS.find((item) => item.value === method)?.label ?? method)

const expenseCategoryLabel = (category: ExpenseCategory, t: Tr = russian) => {
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
const describeReceipt = (receipt: FiscalReceipt, t: Tr = russian) => {
  if (receipt.status === 'failed') return { text: t('чек не прошёл'), isAlert: true }
  if (receipt.status === 'cancelled') return { text: t('чек отменён'), isAlert: false }
  if (receipt.status !== 'issued') {
    return {
      text: t(receipt.kind === 'refund' ? 'возврат чека отправляется' : 'чек отправляется'),
      isAlert: false,
    }
  }
  return {
    text: t(receipt.kind === 'refund' ? 'возврат чека №{number}' : 'чек №{number}', {
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
