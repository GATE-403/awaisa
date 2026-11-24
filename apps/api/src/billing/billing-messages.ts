import { currentRegion } from '../common/region.js'
import type { ReminderStage } from './plan-rules.js'

/** «21 декабря», on the region's clock. */
const formatDay = (date: Date) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: currentRegion().timeZone,
  }).format(date)

const monthsText = (months: number) =>
  months === 12 ? '1 год' : months === 1 ? '1 месяц' : `${months} мес.`

/** What a plan order is, on /pay and in the order list. */
const orderTitle = (order: {
  kind: 'plan' | 'sms'
  planTitle: string | null
  months: number | null
  smsCount: number | null
}) =>
  order.kind === 'sms'
    ? `Пакет ${order.smsCount ?? 0} SMS`
    : `Тариф «${order.planTitle ?? ''}» на ${monthsText(order.months ?? 1)}`

/**
 * The owner's reminder about the plan's end (SMS and Telegram): what happens and where to pay.
 * Kept short: one SMS segment of Cyrillic is 70 characters, so the link goes last.
 */
const reminderText = (
  stage: ReminderStage,
  input: { businessName: string; planTitle: string; isTrial: boolean; endsAt: Date; link: string },
) => {
  const what = input.isTrial ? 'Пробный период' : `Тариф «${input.planTitle}»`
  if (stage === 'soon') {
    return `${input.businessName}: ${what} заканчивается ${formatDay(input.endsAt)}. Продлить: ${input.link}`
  }
  const ended = input.isTrial
    ? 'пробный период закончился'
    : `тариф «${input.planTitle}» закончился`
  return `${input.businessName}: ${ended}, касса, аналитика и рассылки закрыты. Продлить: ${input.link}`
}

export { formatDay, monthsText, orderTitle, reminderText }
