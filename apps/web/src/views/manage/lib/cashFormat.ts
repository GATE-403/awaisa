import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { ExpenseCategory, FiscalReceipt, SalePaymentMethod } from '@/shared/api/types'
import type { Format, Translate } from '@/shared/i18n'

const SALE_METHODS: { value: SalePaymentMethod; label: MessageDescriptor }[] = [
  { value: 'cash', label: msg({ message: 'Cash', context: 'payment method' }) },
  { value: 'card', label: msg({ message: 'Card', context: 'payment method' }) },
  { value: 'transfer', label: msg({ message: 'Transfer', context: 'payment method' }) },
]

const METHOD_LABEL: Record<SalePaymentMethod, MessageDescriptor> = {
  cash: msg`cash`,
  card: msg`card`,
  transfer: msg`transfer`,
}

/** The presets every business starts with; anything else is the owner's own word. */
const EXPENSE_CATEGORIES: { value: string; label: MessageDescriptor }[] = [
  { value: 'rent', label: msg`Rent` },
  { value: 'materials', label: msg`Materials` },
  { value: 'salaries', label: msg`Salaries` },
  { value: 'utilities', label: msg`Utilities` },
  { value: 'marketing', label: msg`Marketing` },
  { value: 'other', label: msg({ message: 'Other', context: 'expense category' }) },
]

const saleMethodLabel = (method: SalePaymentMethod, t: Translate) => {
  const label = SALE_METHODS.find((item) => item.value === method)?.label
  return label ? t(label) : method
}

const expenseCategoryLabel = (category: ExpenseCategory, t: Translate) => {
  const preset = EXPENSE_CATEGORIES.find((item) => item.value === category)
  return preset ? t(preset.label) : category
}

// Quantities may be fractional for some units; shown without trailing zeros («2.5» · «2,5»).
const formatCount = (format: Format, value: number) =>
  format.number(value, { maximumFractionDigits: 2 })

/**
 * A receipt in a row's meta line: its number once issued, else what is happening to it. `isAlert`
 * paints it red: the provider refused it and somebody has to send it again.
 */
const describeReceipt = (receipt: FiscalReceipt, t: Translate) => {
  if (receipt.status === 'failed') return { text: t(msg`receipt failed`), isAlert: true }
  if (receipt.status === 'cancelled') return { text: t(msg`receipt cancelled`), isAlert: false }
  if (receipt.status !== 'issued') {
    return {
      text: t(receipt.kind === 'refund' ? msg`refund receipt on its way` : msg`receipt on its way`),
      isAlert: false,
    }
  }
  const number = receipt.fiscalNumber ?? ''
  return {
    text: t(
      receipt.kind === 'refund' ? msg`refund receipt No. ${number}` : msg`receipt No. ${number}`,
    ),
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
