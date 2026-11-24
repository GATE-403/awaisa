type BookingMessageInput = {
  business: { name: string; slug: string }
  serviceName: string
  specialistName: string
  date: string
  time: string
}

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

// `link` opens the visit without signing in (common/visit-link.ts): move or cancel from there.
const confirmationMessage = (booking: BookingMessageInput, link: string) =>
  `${booking.business.name}: вы записаны - ${booking.serviceName}, ${formatDate(booking.date)} в ${booking.time}, мастер ${booking.specialistName}. Перенести или отменить: ${link}`

const reminderMessage = (booking: BookingMessageInput, isToday = true, link?: string) =>
  `${booking.business.name}: напоминаем - ${isToday ? 'сегодня' : 'завтра'} в ${booking.time} ${booking.serviceName}, мастер ${booking.specialistName}. Ждём вас!${link ? ` Перенести: ${link}` : ''}`

const salonCancellationMessage = (booking: BookingMessageInput, webUrl: string) =>
  `${booking.business.name}: к сожалению, запись на ${formatDate(booking.date)} в ${booking.time} отменена. Выберите другое время: ${webUrl}/${booking.business.slug}/book`

const rescheduleMessage = (booking: BookingMessageInput, link: string) =>
  `${booking.business.name}: запись перенесена - ${booking.serviceName}, ${formatDate(booking.date)} в ${booking.time}, мастер ${booking.specialistName}. Подробнее: ${link}`

// Asked once, two hours after the visit; the link opens the rating without signing in.
const reviewRequestMessage = (businessName: string, link: string) =>
  `${businessName}: как прошёл визит? Оцените мастера - это 10 секунд: ${link}`

// The owner gave a master their number: tell the master where their day lives.
const masterInviteMessage = (businessName: string, link: string) =>
  `${businessName}: вам открыт «Мой день» - ваши записи и клиенты. Войдите по этому номеру: ${link}`

// The waitlist: a time opened up on the day the client wanted; the link opens it in the form.
const waitlistFreedMessage = (
  businessName: string,
  serviceName: string,
  date: string,
  time: string,
  link: string,
) =>
  `${businessName}: освободилось время - ${serviceName}, ${formatDate(date)} в ${time}. Успейте записаться: ${link}`

// «Пора прийти снова»: one nudge N days after the visit, with a link to the same master.
const returnVisitMessage = (
  businessName: string,
  serviceName: string,
  masterName: string,
  link: string,
) =>
  `${businessName}: пора снова на «${serviceName}»? ${masterName.split(' ')[0]} ждёт вас - запишитесь: ${link}`

// The owner added this number as an administrator: where the cabinet is.
const adminInviteMessage = (businessName: string, link: string) =>
  `${businessName}: вас добавили администратором - расписание и клиенты. Войдите по этому номеру: ${link}`

export type { BookingMessageInput }
export {
  adminInviteMessage,
  confirmationMessage,
  masterInviteMessage,
  reminderMessage,
  returnVisitMessage,
  waitlistFreedMessage,
  rescheduleMessage,
  reviewRequestMessage,
  salonCancellationMessage,
}
