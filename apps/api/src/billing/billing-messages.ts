import type { ReminderStage } from './plan-rules.js'

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Asia/Bishkek',
})

/** «21 December». */
const formatDay = (date: Date) => dayFormat.format(date)

const monthsText = (months: number) =>
  months === 12 ? '1 year' : months === 1 ? '1 month' : `${months} months`

/** What a plan order is, on /pay and in the order list. */
const orderTitle = (order: {
  kind: 'plan' | 'sms'
  planTitle: string | null
  months: number | null
  smsCount: number | null
}) =>
  order.kind === 'sms'
    ? `${order.smsCount ?? 0} SMS pack`
    : `“${order.planTitle ?? ''}” plan for ${monthsText(order.months ?? 1)}`

/**
 * The owner's reminder about the plan's end (SMS and Telegram): what happens and where to pay.
 * Kept short so it fits one SMS, with the link last.
 */
const reminderText = (
  stage: ReminderStage,
  input: { businessName: string; planTitle: string; isTrial: boolean; endsAt: Date; link: string },
) => {
  const what = input.isTrial ? 'Your free trial' : `Your “${input.planTitle}” plan`
  if (stage === 'soon') {
    return `${input.businessName}: ${what} ends on ${formatDay(input.endsAt)}. Renew: ${input.link}`
  }
  const ended = input.isTrial ? 'your free trial' : `your “${input.planTitle}” plan`
  return `${input.businessName}: ${ended} has ended, so the till, analytics and mailings are closed. Renew: ${input.link}`
}

export { formatDay, monthsText, orderTitle, reminderText }
