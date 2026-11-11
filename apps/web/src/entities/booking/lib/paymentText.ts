import type { BookingPayment } from '@/shared/api/types'
import { formatPrice } from './bookingUtils'

// One wording for the deposit everywhere: ticket, cabinet, schedule.
const PAYMENT_STATUS_TEXT: Record<BookingPayment['status'], string> = {
  pending: 'ждёт оплаты',
  paid: 'внесена',
  refunded: 'возвращена',
  kept: 'удержана',
  expired: 'не оплачена',
}

const describeDeposit = (payment: BookingPayment) =>
  `Предоплата ${formatPrice(payment.amount)} ${PAYMENT_STATUS_TEXT[payment.status]}`

export { describeDeposit, PAYMENT_STATUS_TEXT }
