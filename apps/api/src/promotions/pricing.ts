// Promotions a business runs: discounts the client sees before booking and the booking keeps.
type PromotionKind = 'happy_hours' | 'first_visit' | 'promo_code'

type PromotionRule = {
  id: string
  title: string
  kind: PromotionKind
  percent: number
  /** promo_code only, stored upper-case. */
  code: string | null
  /** happy_hours: weekdays it runs (0 = Monday); null = every day. */
  weekdays: number[] | null
  /** happy_hours: minutes from midnight, [from, to). */
  fromMinutes: number | null
  toMinutes: number | null
  /** null = every service. */
  serviceIds: string[] | null
  /** Optional date range, YYYY-MM-DD, inclusive. */
  startsOn: string | null
  endsOn: string | null
  isActive: boolean
}

type PricingInput = {
  serviceId: string
  price: number
  /** Services done after the first in the same visit; a promotion counts the ones it covers. */
  extras?: { serviceId: string; price: number }[]
  /** The visit's day and start (business time). */
  date: string
  weekday: number
  minutes: number
  /** No earlier confirmed visit at this business on this phone. */
  isFirstVisit: boolean
  code: string | null
}

type Discount = { promotionId: string; title: string; percent: number; amount: number }

const normalizeCode = (code: string | null | undefined) => {
  const value = code?.trim().toUpperCase() ?? ''
  return value === '' ? null : value
}

/** What of the visit a rule discounts: every service, or only those it names. */
const coveredPrice = (rule: PromotionRule, input: PricingInput) =>
  [{ serviceId: input.serviceId, price: input.price }, ...(input.extras ?? [])]
    .filter((line) => !rule.serviceIds || rule.serviceIds.includes(line.serviceId))
    .reduce((sum, line) => sum + line.price, 0)

const applies = (rule: PromotionRule, input: PricingInput) => {
  if (!rule.isActive) return false
  if (rule.startsOn && input.date < rule.startsOn) return false
  if (rule.endsOn && input.date > rule.endsOn) return false
  if (rule.kind === 'promo_code')
    return rule.code !== null && rule.code === normalizeCode(input.code)
  if (rule.kind === 'first_visit') return input.isFirstVisit
  if (rule.weekdays && !rule.weekdays.includes(input.weekday)) return false
  if (rule.fromMinutes !== null && input.minutes < rule.fromMinutes) return false
  if (rule.toMinutes !== null && input.minutes >= rule.toMinutes) return false
  return true
}

/** Discounts never stack: the client gets the single biggest one that applies. */
const bestDiscount = (rules: PromotionRule[], input: PricingInput): Discount | null => {
  let best: Discount | null = null
  for (const rule of rules) {
    if (!applies(rule, input)) continue
    const amount = Math.round((coveredPrice(rule, input) * rule.percent) / 100)
    if (amount > 0 && (!best || amount > best.amount)) {
      best = { promotionId: rule.id, title: rule.title, percent: rule.percent, amount }
    }
  }
  return best
}

/** Whether a code names one of the business's active promo codes at all (for «не подходит»). */
const isKnownCode = (rules: PromotionRule[], code: string | null) => {
  const normalized = normalizeCode(code)
  return rules.some(
    (rule) => rule.kind === 'promo_code' && rule.isActive && rule.code === normalized,
  )
}

export type { Discount, PricingInput, PromotionKind, PromotionRule }
export { bestDiscount, isKnownCode, normalizeCode }
