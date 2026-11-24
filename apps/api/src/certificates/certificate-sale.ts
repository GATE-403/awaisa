import { PAYMENT_HOLD_MINUTES } from '../bookings/booking-rules.js'

/** How many amounts a place may offer on its page. */
const MAX_AMOUNTS = 6
const MIN_AMOUNT = 100
const MAX_AMOUNT = 1_000_000

/**
 * A little longer than the acquirer's own lifetime for the payment (the hold): a card paid at
 * the last second must still find its order waiting.
 */
const ORDER_GRACE_MINUTES = 2

/** The amounts as the owner typed them: whole, in range, no repeats, smallest first. */
const normalizeAmounts = (amounts: number[]) =>
  [...new Set(amounts.map(Math.round))]
    .filter((amount) => amount >= MIN_AMOUNT && amount <= MAX_AMOUNT)
    .sort((left, right) => left - right)
    .slice(0, MAX_AMOUNTS)

/** Until when an order made `now` waits for its payment. */
const orderDueAt = (now: Date) =>
  new Date(now.getTime() + (PAYMENT_HOLD_MINUTES + ORDER_GRACE_MINUTES) * 60_000)

const formatSom = (amount: number) => `${amount.toLocaleString('en-GB')} som`

type PaidOrder = {
  business: string
  amount: number
  code: string
  buyerName: string
  recipientName: string
  hasRecipientPhone: boolean
  message: string
  link: string
}

/** To the buyer: the code, and whether the recipient got it too. */
const buyerMessage = (order: PaidOrder) => {
  const whom = order.recipientName ? ` for ${order.recipientName}` : ''
  const handOver = order.hasRecipientPhone
    ? 'We have sent it to the recipient too.'
    : 'Pass the code on to the recipient.'
  return `${order.business}: your ${formatSom(order.amount)} gift card${whom} is paid. Code ${order.code}. ${handOver} Book: ${order.link}`
}

/** To the recipient: who it is from, the words, the code and where to book. */
const recipientMessage = (order: PaidOrder) => {
  const greeting = order.recipientName ? `${order.recipientName}, ` : ''
  const words = order.message ? ` “${order.message}”` : ''
  const gift = order.buyerName
    ? `${order.buyerName} has given you`
    : `${greeting ? 'you have' : 'You have'} been given`
  return `${greeting}${gift} a ${formatSom(order.amount)} gift card for ${order.business}.${words} Code ${order.code}, give it when you pay. Book: ${order.link}`
}

/** «For Aigul · from Nurlan» under the order's title on /pay. */
const orderDetails = (recipientName: string, buyerName: string) =>
  [recipientName && `For ${recipientName}`, buyerName && `from ${buyerName}`]
    .filter(Boolean)
    .join(' · ')

export type { PaidOrder }
export {
  buyerMessage,
  formatSom,
  MAX_AMOUNTS,
  normalizeAmounts,
  orderDetails,
  orderDueAt,
  recipientMessage,
}
