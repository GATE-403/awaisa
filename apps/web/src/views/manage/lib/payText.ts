import type { MasterPay, MasterPayScheme } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'
import { pluralize } from '@/shared/lib/plural'

const money = new Intl.NumberFormat('en-GB')
const som = (value: number) => `${money.format(value)} som`

// Plain words when a caller passes no `t` (`useT()`'s), so older callers keep working.
const fill = (text: string, vars?: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => String(vars?.[key] ?? match))

const sayer = (t?: Translate) => ({
  say: t ?? fill,
  count: (count: number, forms: [string, string]) =>
    t ? t.count(count, forms) : pluralize(count, forms),
})

/** One line for the "Pay" row: "40% · 2 rates · 5% of products · salary 30,000 a month · minimum 20,000". */
const describePayScheme = (scheme: MasterPayScheme, t?: Translate) => {
  const { say, count } = sayer(t)
  const parts = [
    scheme.percent === null ? null : `${scheme.percent}%`,
    scheme.rates.length === 0 ? null : count(scheme.rates.length, ['rate', 'rates']),
    scheme.productsPercent === null
      ? null
      : say('{percent}% of products', { percent: scheme.productsPercent }),
    scheme.salary === null
      ? null
      : say(scheme.salary.kind === 'month' ? 'salary {amount} a month' : 'salary {amount} a day', {
          amount: money.format(scheme.salary.amount),
        }),
    scheme.minimum === null
      ? null
      : say('minimum {amount}', { amount: money.format(scheme.minimum) }),
  ].filter(Boolean)
  return parts.length === 0 ? say('Not set') : parts.join(' · ')
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
const describeRate = (line: MasterPay['lines'][number], t?: Translate) => {
  const { say } = sayer(t)
  const amount = (value: number) => say('{amount} som', { amount: money.format(value) })
  if (line.kind === 'fixed') return `${amount(line.rate ?? 0)} × ${line.visits}`
  if (line.kind === 'percent') {
    return say('{percent}% of {base}', { percent: line.rate ?? 0, base: amount(line.base) })
  }
  return say('no rate')
}

export { describePayScheme, describeRate, plainPercent, som }
