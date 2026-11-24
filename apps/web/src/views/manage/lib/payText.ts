import { msg, ph, plural } from '@lingui/core/macro'
import type { MasterPay, MasterPayScheme } from '@/shared/api/types'
import type { Format, Translate } from '@/shared/i18n'

/** One line for the "Pay" row: "40% · 2 rates · 5% of products · salary 30,000 a month · minimum 20,000". */
const describePayScheme = (scheme: MasterPayScheme, t: Translate, format: Format) => {
  const rates = scheme.rates.length
  const productsPercent = scheme.productsPercent
  const parts = [
    scheme.percent === null ? null : `${scheme.percent}%`,
    rates === 0 ? null : t(msg`${plural(rates, { one: '# rate', other: '# rates' })}`),
    productsPercent === null ? null : t(msg`${productsPercent}% of products`),
    scheme.salary === null
      ? null
      : scheme.salary.kind === 'month'
        ? t(msg`salary ${ph({ amount: format.amount(scheme.salary.amount) })} a month`)
        : t(msg`salary ${ph({ amount: format.amount(scheme.salary.amount) })} a day`),
    scheme.minimum === null
      ? null
      : t(msg`minimum ${ph({ amount: format.amount(scheme.minimum) })}`),
  ].filter(Boolean)
  return parts.length === 0
    ? t(msg({ message: 'Not set', context: 'no pay scheme, feminine' }))
    : parts.join(' · ')
}

/** The master's percent when it alone decided the pay ("1,000 som due · 40%"). */
const plainPercent = (pay: MasterPay, percent: number | null) =>
  percent !== null &&
  pay.salary === 0 &&
  pay.products === 0 &&
  pay.minimum === null &&
  pay.lines.every((line) => line.kind === 'percent' && line.rate === percent)
    ? percent
    : null

/** How a service line was counted: "40%", "300 som × 2", "no rate". */
const describeRate = (line: MasterPay['lines'][number], t: Translate, format: Format) => {
  const amount = format.price
  if (line.kind === 'fixed') return `${amount(line.rate ?? 0)} × ${line.visits}`
  if (line.kind === 'percent') {
    const percent = line.rate ?? 0
    const base = amount(line.base)
    return t(msg`${percent}% of ${base}`)
  }
  return t(msg`no rate`)
}

export { describePayScheme, describeRate, plainPercent }
