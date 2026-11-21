import type { MasterPay, MasterPayScheme } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'

const money = new Intl.NumberFormat('ru-RU')
const som = (value: number) => `${money.format(value)} сом`

/** One line for the «Зарплата» row: «40% · 2 ставки · 5% с товаров · оклад 30 000 в месяц · минимум 20 000». */
const describePayScheme = (scheme: MasterPayScheme) => {
  const parts = [
    scheme.percent === null ? null : `${scheme.percent}%`,
    scheme.rates.length === 0
      ? null
      : pluralize(scheme.rates.length, ['ставка', 'ставки', 'ставок']),
    scheme.productsPercent === null ? null : `${scheme.productsPercent}% с товаров`,
    scheme.salary === null
      ? null
      : `оклад ${money.format(scheme.salary.amount)} ${scheme.salary.kind === 'month' ? 'в месяц' : 'в день'}`,
    scheme.minimum === null ? null : `минимум ${money.format(scheme.minimum)}`,
  ].filter(Boolean)
  return parts.length === 0 ? 'Не задана' : parts.join(' · ')
}

/** The master's percent when it alone decided the pay («к выплате 1 000 сом · 40%»). */
const plainPercent = (pay: MasterPay, percent: number | null) =>
  percent !== null &&
  pay.salary === 0 &&
  pay.products === 0 &&
  pay.minimum === null &&
  pay.lines.every((line) => line.kind === 'percent' && line.rate === percent)
    ? percent
    : null

/** How a service line was counted: «40%», «300 сом × 2», «без ставки». */
const describeRate = (line: MasterPay['lines'][number]) => {
  if (line.kind === 'fixed') return `${som(line.rate ?? 0)} × ${line.visits}`
  if (line.kind === 'percent') return `${line.rate}% от ${som(line.base)}`
  return 'без ставки'
}

export { describePayScheme, describeRate, plainPercent, som }
