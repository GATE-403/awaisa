type BookingLine = {
  time: string
  serviceName: string
  specialistName: string
  customerName: string
  customerPhone?: string
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
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
    `🗓 <b>New booking</b> · ${escapeHtml(business)}`,
    `${formatDate(date)}, <b>${booking.time}</b> - ${escapeHtml(booking.serviceName)}`,
    `Specialist: ${escapeHtml(booking.specialistName)}`,
    `Client: ${escapeHtml(booking.customerName)}${booking.customerPhone ? `, ${booking.customerPhone}` : ''}`,
  ].join('\n')

const cancelledText = (business: string, date: string, booking: BookingLine) =>
  [
    `✖️ <b>Client cancelled a booking</b> · ${escapeHtml(business)}`,
    `${formatDate(date)}, ${booking.time} - ${escapeHtml(booking.serviceName)}, ${escapeHtml(booking.specialistName)}`,
    `Client: ${escapeHtml(booking.customerName)}`,
    'The time is free to book again.',
  ].join('\n')

const movedByClientText = (
  business: string,
  date: string,
  booking: BookingLine & { previous: string },
) => {
  const [previousDate = '', previousTime = ''] = booking.previous.split(' ')
  return [
    `🔁 <b>Client moved a booking</b> · ${escapeHtml(business)}`,
    `Was: ${formatDate(previousDate)}, ${previousTime}`,
    `Now: ${formatDate(date)}, <b>${booking.time}</b> - ${escapeHtml(booking.serviceName)}, ${escapeHtml(booking.specialistName)}`,
    `Client: ${escapeHtml(booking.customerName)}`,
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
    `${stars(review.rating)} <b>New review</b> · ${escapeHtml(business)}`,
    `${escapeHtml(review.authorName)} about ${escapeHtml(review.specialistName)}`,
    review.comment ? `“${escapeHtml(review.comment)}”` : '',
    answerUrl && review.rating <= ANSWER_IN_PERSON_UP_TO
      ? `<b>Reply to the client today:</b> <a href="${escapeHtml(answerUrl)}">open reviews</a>`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

const questionText = (business: string, authorName: string, text: string) =>
  [
    `❓ <b>New question</b> · ${escapeHtml(business)}`,
    `${escapeHtml(authorName)}: “${escapeHtml(text)}”`,
    'Answer in the dashboard: Reviews → Questions.',
  ].join('\n')

/** A moderator took a work photo off the place's page: the owner hears why it is gone. */
const photoModeratedText = (
  business: string,
  serviceName: string | null,
  action: 'hide' | 'delete',
  cabinetUrl: string,
) =>
  [
    `🚫 <b>A moderator ${action === 'hide' ? 'hid' : 'deleted'} a work photo</b> · ${escapeHtml(business)}`,
    serviceName ? `Service: ${escapeHtml(serviceName)}.` : null,
    'Clients reported it and an Awaisa moderator checked the reports.',
    action === 'hide'
      ? 'Clients no longer see it, and it cannot be shown again from the dashboard.'
      : 'The photo is no longer on your page.',
    `Your other work: <a href="${escapeHtml(cabinetUrl)}">dashboard</a>.`,
  ]
    .filter(Boolean)
    .join('\n')

const dayText = (business: string, date: string, bookings: BookingLine[], title = 'Today') => {
  if (bookings.length === 0) {
    return `☀️ <b>${title}, ${formatDate(date)}</b> · ${escapeHtml(business)}\nNo bookings.`
  }

  return [
    `☀️ <b>${title}, ${formatDate(date)}</b> · ${escapeHtml(business)} - ${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'}`,
    ...bookings.map(
      (booking) =>
        `<b>${booking.time}</b> ${escapeHtml(booking.serviceName)} - ${escapeHtml(booking.customerName)} · ${escapeHtml(booking.specialistName)}`,
    ),
  ].join('\n')
}

const linkedText = (business: string) =>
  `✅ Done! New bookings, cancellations and reviews for “${escapeHtml(business)}” will come here, and every morning the day's schedule.\n\n/today - today's bookings\n/stop - turn notifications off`

const unclosedText = (count: number) =>
  `📋 Visits not marked today: <b>${count}</b>. Open the schedule and mark who came, so your revenue is accurate.`

const HELP_TEXT =
  "This is the Awaisa bot for business owners. Connect it in the dashboard: Settings → Notifications.\n\n/today - today's bookings\n/stop - turn notifications off"

// «Sign in with Telegram»: the bot asks for the person's own number with one button.
const LOGIN_ASK_CONTACT =
  'Signing in to <b>Awaisa</b>. Tap “Share my number” below, so we know your number and can open your profile with your bookings.'
const LOGIN_SHARE_BUTTON = '📱 Share my number'
const LOGIN_DONE =
  'Done, you are signed in. Go back to the site or the app. Visit reminders will now come here.'
const LOGIN_EXPIRED = 'The sign-in link has expired. Tap “Sign in with Telegram” on the site again.'
// A chat that already shared its number signs in at once, with a way to use another one.
const loginKnownText = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  const shown = digits.startsWith('996')
    ? `+996 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
    : phone
  return `Done, you are signed in with <b>${escapeHtml(shown)}</b>. Go back to the site or the app.\n\nAnother number? Send /stop and sign in again.`
}
const LOGIN_NOT_OWN = 'We need your own number: tap “Share my number” below.'
const LOGIN_REFUSED = 'For now we only accept Kyrgyzstan numbers (+996).'

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
