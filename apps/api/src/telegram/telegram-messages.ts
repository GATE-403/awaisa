type BookingLine = {
  time: string
  serviceName: string
  specialistName: string
  customerName: string
  customerPhone?: string
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

// Telegram HTML mode: only these three characters need escaping.
const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const formatDate = (dateKey: string) => {
  const [, month = 1, day = 1] = dateKey.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]}`
}

const stars = (rating: number) => '★'.repeat(rating) + '☆'.repeat(5 - rating)

const newBookingText = (business: string, date: string, booking: BookingLine) =>
  [
    `🗓 <b>Новая запись</b> · ${escapeHtml(business)}`,
    `${formatDate(date)}, <b>${booking.time}</b> — ${escapeHtml(booking.serviceName)}`,
    `Мастер: ${escapeHtml(booking.specialistName)}`,
    `Клиент: ${escapeHtml(booking.customerName)}${booking.customerPhone ? `, ${booking.customerPhone}` : ''}`,
  ].join('\n')

const cancelledText = (business: string, date: string, booking: BookingLine) =>
  [
    `✖️ <b>Клиент отменил запись</b> · ${escapeHtml(business)}`,
    `${formatDate(date)}, ${booking.time} — ${escapeHtml(booking.serviceName)}, ${escapeHtml(booking.specialistName)}`,
    `Клиент: ${escapeHtml(booking.customerName)}`,
    'Время снова свободно для записи.',
  ].join('\n')

const movedByClientText = (
  business: string,
  date: string,
  booking: BookingLine & { previous: string },
) => {
  const [previousDate = '', previousTime = ''] = booking.previous.split(' ')
  return [
    `🔁 <b>Клиент перенёс запись</b> · ${escapeHtml(business)}`,
    `Было: ${formatDate(previousDate)}, ${previousTime}`,
    `Стало: ${formatDate(date)}, <b>${booking.time}</b> — ${escapeHtml(booking.serviceName)}, ${escapeHtml(booking.specialistName)}`,
    `Клиент: ${escapeHtml(booking.customerName)}`,
  ].join('\n')
}

const reviewText = (
  business: string,
  review: { rating: number; comment: string; authorName: string; specialistName: string },
) =>
  [
    `${stars(review.rating)} <b>Новый отзыв</b> · ${escapeHtml(business)}`,
    `${escapeHtml(review.authorName)} о мастере ${escapeHtml(review.specialistName)}`,
    review.comment ? `«${escapeHtml(review.comment)}»` : '',
  ]
    .filter(Boolean)
    .join('\n')

const dayText = (business: string, date: string, bookings: BookingLine[], title = 'Сегодня') => {
  if (bookings.length === 0) {
    return `☀️ <b>${title}, ${formatDate(date)}</b> · ${escapeHtml(business)}\nЗаписей нет.`
  }

  return [
    `☀️ <b>${title}, ${formatDate(date)}</b> · ${escapeHtml(business)} — ${bookings.length} ${
      bookings.length % 10 === 1 && bookings.length % 100 !== 11
        ? 'запись'
        : [2, 3, 4].includes(bookings.length % 10) && ![12, 13, 14].includes(bookings.length % 100)
          ? 'записи'
          : 'записей'
    }`,
    ...bookings.map(
      (booking) =>
        `<b>${booking.time}</b> ${escapeHtml(booking.serviceName)} — ${escapeHtml(booking.customerName)} · ${escapeHtml(booking.specialistName)}`,
    ),
  ].join('\n')
}

const linkedText = (business: string) =>
  `✅ Готово! Сюда будут приходить новые записи, отмены и отзывы «${escapeHtml(business)}», а каждое утро — расписание на день.\n\n/today — записи на сегодня\n/stop — отключить уведомления`

const unclosedText = (count: number) =>
  `📋 Сегодня не отмечено визитов: <b>${count}</b>. Откройте расписание и отметьте, кто пришёл — так выручка будет точной.`

const HELP_TEXT =
  'Это бот Awaisa для владельцев. Подключите его в кабинете: Профиль → Уведомления в Telegram.\n\n/today — записи на сегодня\n/stop — отключить уведомления'

export type { BookingLine }
export {
  cancelledText,
  dayText,
  escapeHtml,
  HELP_TEXT,
  linkedText,
  movedByClientText,
  newBookingText,
  reviewText,
  unclosedText,
}
