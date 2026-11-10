type BookingMessageInput = {
  business: { name: string; slug: string }
  serviceName: string
  specialistName: string
  date: string
  time: string
}

const PLATFORM_NAME = 'Awaisa'

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

const formatDate = (dateKey: string) => {
  const [, month = 1, day = 1] = dateKey.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]}`
}

const otpMessage = (code: string) =>
  `${code} — код для входа в ${PLATFORM_NAME}. Никому его не сообщайте.`

const confirmationMessage = (booking: BookingMessageInput, webUrl: string) =>
  `${booking.business.name}: вы записаны — ${booking.serviceName}, ${formatDate(booking.date)} в ${booking.time}, мастер ${booking.specialistName}. Отменить: ${webUrl}/bookings`

const reminderMessage = (booking: BookingMessageInput, isToday = true) =>
  `${booking.business.name}: напоминаем — ${isToday ? 'сегодня' : 'завтра'} в ${booking.time} ${booking.serviceName}, мастер ${booking.specialistName}. Ждём вас!`

const salonCancellationMessage = (booking: BookingMessageInput, webUrl: string) =>
  `${booking.business.name}: к сожалению, запись на ${formatDate(booking.date)} в ${booking.time} отменена. Выберите другое время: ${webUrl}/${booking.business.slug}/book`

const rescheduleMessage = (booking: BookingMessageInput, webUrl: string) =>
  `${booking.business.name}: запись перенесена — ${booking.serviceName}, ${formatDate(booking.date)} в ${booking.time}, мастер ${booking.specialistName}. Подробнее: ${webUrl}/bookings`

export type { BookingMessageInput }
export {
  confirmationMessage,
  otpMessage,
  reminderMessage,
  rescheduleMessage,
  salonCancellationMessage,
}
