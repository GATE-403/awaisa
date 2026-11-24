import type { Format } from '@/shared/i18n'

const formatQuantity = (format: Format, value: number) =>
  format.number(value, { maximumFractionDigits: 2 })

export { formatQuantity }
