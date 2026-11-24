import type { MessageDescriptor } from '@lingui/core'
import { msg, ph } from '@lingui/core/macro'
import type { BookingPayment } from '@/shared/api/types'
import type { Format, Translate } from '@/shared/i18n'

// One wording for the deposit everywhere: ticket, cabinet, schedule.
const PAYMENT_STATUS_TEXT: Record<BookingPayment['status'], MessageDescriptor> = {
  pending: msg`awaiting payment`,
  paid: msg`paid`,
  refunded: msg`refunded`,
  kept: msg`kept`,
  expired: msg`not paid`,
}

const describeDeposit = (payment: BookingPayment, t: Translate, format: Format) =>
  t(
    msg`Deposit ${ph({ amount: format.price(payment.amount) })} ${ph({ status: t(PAYMENT_STATUS_TEXT[payment.status]) })}`,
  )

export { describeDeposit, PAYMENT_STATUS_TEXT }
