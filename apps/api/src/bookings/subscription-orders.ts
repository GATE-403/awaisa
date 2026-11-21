import { addDays, toBusinessParts } from '../common/business-time.js'

type OrderStatus = 'pending' | 'paid' | 'expired'

/** What a subscription order carries from its plan at the moment it was placed. */
type OrderTerms = {
  title: string
  serviceId: string | null
  visits: number
  validDays: number
  amount: number
}

/**
 * The payment of an order came through. A pending order becomes a subscription; so does one that
 * expired before the acquirer reported (the money came, and a subscription takes no one's time);
 * a paid one was handled before (the notification and the client's return report the same payment).
 */
const shouldIssue = (status: OrderStatus) => status !== 'paid'

/**
 * The client's subscription made from a paid order: counted from the day of the payment (in
 * business time) and dated by it, so revenue counts the sale on the day the money came.
 */
const issuedSubscription = (terms: OrderTerms, paidAt: Date) => ({
  title: terms.title,
  serviceId: terms.serviceId,
  visitsTotal: terms.visits,
  visitsLeft: terms.visits,
  pricePaid: terms.amount,
  expiresOn: addDays(toBusinessParts(paidAt).dateKey, terms.validDays),
  createdAt: paidAt,
})

/** What the plan's visits cost one by one; null when it is for any service. */
const fullPrice = (visits: number, servicePrice: number | null) =>
  servicePrice === null ? null : visits * servicePrice

/** A plan (or a subscription) covers a service when it is for that service or for any. */
const coversService = (planServiceId: string | null, serviceId: string) =>
  planServiceId === null || planServiceId === serviceId

export type { OrderStatus, OrderTerms }
export { coversService, fullPrice, issuedSubscription, shouldIssue }
