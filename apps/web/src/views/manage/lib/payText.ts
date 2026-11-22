import type { MasterPay, MasterPayScheme } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'
import { pluralize } from '@/shared/lib/plural'

const money = new Intl.NumberFormat('ru-RU')
const som = (value: number) => `${money.format(value)} сом`

// Russian when a caller passes no `t` (`useT()`'s), so older callers keep working.
const fill = (text: string, vars?: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => String(vars?.[key] ?? match))

const sayer = (t?: Translate) => ({
  say: t ?? fill,
  count: (count: number, forms: [string, string, string]) =>
    t ? t.count(count, forms) : pluralize(count, forms),
})

/** One line for the «Зарплата» row: «40% · 2 ставки · 5% с товаров · оклад 30 000 в месяц · минимум 20 000». */
const describePayScheme = (scheme: MasterPayScheme, t?: Translate) => {
  const { say, count } = sayer(t)
  const parts = [
    scheme.percent === null ? null : `${scheme.percent}%`,
    scheme.rates.length === 0 ? null : count(scheme.rates.length, ['ставка', 'ставки', 'ставок']),
    scheme.productsPercent === null
      ? null
      : say('{percent}% с товаров', { percent: scheme.productsPercent }),
    scheme.salary === null
      ? null
      : say(scheme.salary.kind === 'month' ? 'оклад {amount} в месяц' : 'оклад {amount} в день', {
          amount: money.format(scheme.salary.amount),
        }),
    scheme.minimum === null
      ? null
      : say('минимум {amount}', { amount: money.format(scheme.minimum) }),
  ].filter(Boolean)
  return parts.length === 0 ? say('Не задана') : parts.join(' · ')
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
const describeRate = (line: MasterPay['lines'][number], t?: Translate) => {
  const { say } = sayer(t)
  const amount = (value: number) => say('{amount} сом', { amount: money.format(value) })
  if (line.kind === 'fixed') return `${amount(line.rate ?? 0)} × ${line.visits}`
  if (line.kind === 'percent') {
    return say('{percent}% от {base}', { percent: line.rate ?? 0, base: amount(line.base) })
  }
  return say('без ставки')
}

export { describePayScheme, describeRate, plainPercent, som }
