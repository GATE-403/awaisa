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

const formatSom = (amount: number) => `${amount.toLocaleString('ru-RU').replace(/\s/g, ' ')} сом`

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
  const whom = order.recipientName ? ` для ${order.recipientName}` : ''
  const handOver = order.hasRecipientPhone
    ? 'Мы отправили его и получателю.'
    : 'Передайте код получателю.'
  return `${order.business}: сертификат${whom} на ${formatSom(order.amount)} оплачен. Код ${order.code}. ${handOver} Записаться: ${order.link}`
}

/** To the recipient: who it is from, the words, the code and where to book. */
const recipientMessage = (order: PaidOrder) => {
  const from = order.buyerName || 'Вам'
  const greeting = order.recipientName ? `${order.recipientName}, ` : ''
  const words = order.message ? ` «${order.message}»` : ''
  const verb = order.buyerName ? 'дарит вам' : 'подарили'
  return `${greeting}${from} ${verb} сертификат на ${formatSom(order.amount)} в ${order.business}.${words} Код ${order.code}, назовите его при оплате. Записаться: ${order.link}`
}

/** «Для Айгуль · от Нурлана» under the order's title on /pay. */
const orderDetails = (recipientName: string, buyerName: string) =>
  [recipientName && `Для ${recipientName}`, buyerName && `от ${buyerName}`]
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
