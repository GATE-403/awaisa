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

// Ratings up to this one are not answered automatically: the owner is asked to answer in person.
const ANSWER_IN_PERSON_UP_TO = 3

const reviewText = (
  business: string,
  review: { rating: number; comment: string; authorName: string; specialistName: string },
  answerUrl?: string,
) =>
  [
    `${stars(review.rating)} <b>Новый отзыв</b> · ${escapeHtml(business)}`,
    `${escapeHtml(review.authorName)} о мастере ${escapeHtml(review.specialistName)}`,
    review.comment ? `«${escapeHtml(review.comment)}»` : '',
    answerUrl && review.rating <= ANSWER_IN_PERSON_UP_TO
      ? `<b>Ответьте клиенту сегодня:</b> <a href="${escapeHtml(answerUrl)}">открыть отзывы</a>`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

const questionText = (business: string, authorName: string, text: string) =>
  [
    `❓ <b>Новый вопрос</b> · ${escapeHtml(business)}`,
    `${escapeHtml(authorName)}: «${escapeHtml(text)}»`,
    'Ответьте в кабинете: Отзывы → Вопросы.',
  ].join('\n')

/** A moderator took a work photo off the place's page: the owner hears why it is gone. */
const photoModeratedText = (
  business: string,
  serviceName: string | null,
  action: 'hide' | 'delete',
  cabinetUrl: string,
) =>
  [
    `🚫 <b>Фото работы ${action === 'hide' ? 'скрыто' : 'удалено'} модератором</b> · ${escapeHtml(business)}`,
    serviceName ? `Услуга: ${escapeHtml(serviceName)}.` : null,
    'На него пожаловались клиенты, модератор Awaisa проверил жалобы.',
    action === 'hide'
      ? 'Клиенты его не видят, показать снова из кабинета нельзя.'
      : 'Фото больше нет на странице.',
    `Остальные работы: <a href="${escapeHtml(cabinetUrl)}">кабинет</a>.`,
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

// «Войти через Telegram»: the bot asks for the person's own number with one button.
const LOGIN_ASK_CONTACT =
  'Вход в <b>Awaisa</b>. Нажмите «Поделиться номером» внизу — так мы узнаем ваш номер и войдём в ваш профиль с записями.'
const LOGIN_SHARE_BUTTON = '📱 Поделиться номером'
const LOGIN_DONE =
  'Готово — вы вошли. Вернитесь на сайт или в приложение. Напоминания о визитах теперь будут приходить сюда.'
const LOGIN_EXPIRED = 'Ссылка для входа устарела. Нажмите «Войти через Telegram» на сайте ещё раз.'
// A chat that already shared its number signs in at once, with a way to use another one.
const loginKnownText = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  const shown = digits.startsWith('996')
    ? `+996 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
    : phone
  return `Готово — вы вошли с номером <b>${escapeHtml(shown)}</b>. Вернитесь на сайт или в приложение.\n\nДругой номер? Отправьте /stop и войдите ещё раз.`
}
const LOGIN_NOT_OWN = 'Нужен ваш собственный номер — нажмите кнопку «Поделиться номером» внизу.'
const LOGIN_REFUSED = 'Пока принимаем только номера Кыргызстана (+996).'

export type { BookingLine }
export {
  cancelledText,
  dayText,
  escapeHtml,
  HELP_TEXT,
  LOGIN_ASK_CONTACT,
  LOGIN_DONE,
  LOGIN_EXPIRED,
  LOGIN_NOT_OWN,
  LOGIN_REFUSED,
  LOGIN_SHARE_BUTTON,
  linkedText,
  loginKnownText,
  movedByClientText,
  newBookingText,
  photoModeratedText,
  questionText,
  reviewText,
  unclosedText,
}
