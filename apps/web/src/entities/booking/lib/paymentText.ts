import type { BookingPayment } from '@/shared/api/types'
import { formatPrice } from './bookingUtils'

// One wording for the deposit everywhere: ticket, cabinet, schedule.
const PAYMENT_STATUS_TEXT: Record<BookingPayment['status'], string> = {
  pending: 'awaiting payment',
  paid: 'paid',
  refunded: 'refunded',
  kept: 'kept',
  expired: 'not paid',
}

const describeDeposit = (payment: BookingPayment) =>
  `Deposit ${formatPrice(payment.amount)} ${PAYMENT_STATUS_TEXT[payment.status]}`

export { describeDeposit, PAYMENT_STATUS_TEXT }
