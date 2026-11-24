type BookingMessageInput = {
  business: { name: string; slug: string }
  serviceName: string
  specialistName: string
  date: string
  time: string
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

const formatDate = (dateKey: string) => {
  const [, month = 1, day = 1] = dateKey.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]}`
}

// `link` opens the visit without signing in (common/visit-link.ts): move or cancel from there.
const confirmationMessage = (booking: BookingMessageInput, link: string) =>
  `${booking.business.name}: you're booked - ${booking.serviceName}, ${formatDate(booking.date)} at ${booking.time} with ${booking.specialistName}. Change or cancel: ${link}`

const reminderMessage = (booking: BookingMessageInput, isToday = true, link?: string) =>
  `${booking.business.name}: a reminder - ${booking.serviceName} ${isToday ? 'today' : 'tomorrow'} at ${booking.time} with ${booking.specialistName}. See you soon!${link ? ` Change: ${link}` : ''}`

const salonCancellationMessage = (booking: BookingMessageInput, webUrl: string) =>
  `${booking.business.name}: sorry, your booking on ${formatDate(booking.date)} at ${booking.time} has been cancelled. Pick another time: ${webUrl}/${booking.business.slug}/book`

const rescheduleMessage = (booking: BookingMessageInput, link: string) =>
  `${booking.business.name}: your booking has moved - ${booking.serviceName}, ${formatDate(booking.date)} at ${booking.time} with ${booking.specialistName}. Details: ${link}`

// Asked once, two hours after the visit; the link opens the rating without signing in.
const reviewRequestMessage = (businessName: string, link: string) =>
  `${businessName}: how was your visit? Rate your specialist, it takes 10 seconds: ${link}`

// The owner gave a master their number: tell the master where their day lives.
const masterInviteMessage = (businessName: string, link: string) =>
  `${businessName}: «My day» is open to you - your bookings and clients. Sign in with this number: ${link}`

// The waitlist: a time opened up on the day the client wanted; the link opens it in the form.
const waitlistFreedMessage = (
  businessName: string,
  serviceName: string,
  date: string,
  time: string,
  link: string,
) =>
  `${businessName}: a time has opened up - ${serviceName}, ${formatDate(date)} at ${time}. Book before it goes: ${link}`

// «Time to come back»: one nudge N days after the visit, with a link to the same master.
const returnVisitMessage = (
  businessName: string,
  serviceName: string,
  masterName: string,
  link: string,
) =>
  `${businessName}: time for another «${serviceName}»? ${masterName.split(' ')[0]} is ready for you - book: ${link}`

// The owner added this number as an administrator: where the cabinet is.
const adminInviteMessage = (businessName: string, link: string) =>
  `${businessName}: you've been added as an administrator - the schedule and clients. Sign in with this number: ${link}`

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
