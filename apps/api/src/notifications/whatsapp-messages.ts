import type { BookingMessageInput } from './messages.js'

/**
 * WhatsApp Business messages to clients go out only as templates approved in Meta Business
 * Manager. The texts below must match the templates there word for word (docs/whatsapp.md):
 * `{{n}}` are the body parameters, and `button` is a URL button whose address is
 * `PUBLIC_WEB_URL/{{1}}`, so only the part after the site's address is sent.
 */
const WHATSAPP_TEMPLATES = {
  booking_confirmation: {
    body: 'You are booked at {{1}}: {{2}}, {{3}} at {{4}} with {{5}}. See you soon!',
    button: 'Change or cancel',
  },
  booking_reminder: {
    body: 'A reminder: {{1}} at {{2}} you have {{3}} at {{4}} with {{5}}. See you soon!',
    button: 'Change or cancel',
  },
  booking_rescheduled: {
    body: 'Your booking at {{1}} has moved: {{2}}, {{3}} at {{4}} with {{5}}. Details are behind the button below.',
    button: 'Open booking',
  },
  booking_cancelled: {
    body: 'Sorry, your booking at {{1}} on {{2}} at {{3}} has been cancelled. Pick another time with the button below.',
    button: 'Pick a time',
  },
  waitlist_freed: {
    body: 'A time has opened up at {{1}}: {{2}}, {{3}} at {{4}}. Book with the button below before it goes.',
    button: 'Book',
  },
  review_request: {
    body: 'How was your visit to {{1}}? Rate your specialist, it takes 10 seconds.',
    button: 'Rate',
  },
  return_visit: {
    body: 'Time for another “{{1}}” at {{2}}? {{3}} is ready for you, book with the button below.',
    button: 'Book',
  },
} as const

type WhatsappTemplate = keyof typeof WHATSAPP_TEMPLATES

type WhatsappMessage = {
  template: WhatsappTemplate
  params: string[]
  /** The whole link; the template's button takes what follows `PUBLIC_WEB_URL/`. */
  url: string
}

// The Graph API payload of one template message.
type WhatsappPayload = {
  messaging_product: 'whatsapp'
  to: string
  type: 'template'
  template: {
    name: string
    language: { code: string }
    components: (
      | { type: 'body'; parameters: { type: 'text'; text: string }[] }
      | {
          type: 'button'
          sub_type: 'url'
          index: '0'
          parameters: { type: 'text'; text: string }[]
        }
    )[]
  }
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

// Meta refuses a parameter with new lines, tabs or more than four spaces in a row.
const cleanParam = (value: string) => value.replace(/\s+/g, ' ').trim() || '-'

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

const bookingParams = (booking: BookingMessageInput) => [
  booking.business.name,
  booking.serviceName,
  formatDate(booking.date),
  booking.time,
  booking.specialistName,
]

const whatsappConfirmation = (booking: BookingMessageInput, link: string): WhatsappMessage => ({
  template: 'booking_confirmation',
  params: bookingParams(booking),
  url: link,
})

const whatsappReminder = (
  booking: BookingMessageInput,
  isToday: boolean,
  link: string,
): WhatsappMessage => ({
  template: 'booking_reminder',
  params: [
    isToday ? 'today' : 'tomorrow',
    booking.time,
    booking.serviceName,
    booking.business.name,
    booking.specialistName,
  ],
  url: link,
})

const whatsappReschedule = (booking: BookingMessageInput, link: string): WhatsappMessage => ({
  template: 'booking_rescheduled',
  params: bookingParams(booking),
  url: link,
})

const whatsappSalonCancellation = (
  booking: BookingMessageInput,
  webUrl: string,
): WhatsappMessage => ({
  template: 'booking_cancelled',
  params: [booking.business.name, formatDate(booking.date), booking.time],
  url: `${webUrl}/${booking.business.slug}/book`,
})

const whatsappWaitlistFreed = (
  businessName: string,
  serviceName: string,
  date: string,
  time: string,
  link: string,
): WhatsappMessage => ({
  template: 'waitlist_freed',
  params: [businessName, serviceName, formatDate(date), time],
  url: link,
})

const whatsappReviewRequest = (businessName: string, link: string): WhatsappMessage => ({
  template: 'review_request',
  params: [businessName],
  url: link,
})

const whatsappReturnVisit = (
  businessName: string,
  serviceName: string,
  masterName: string,
  link: string,
): WhatsappMessage => ({
  template: 'return_visit',
  params: [serviceName, businessName, firstName(masterName)],
  url: link,
})

/**
 * The Graph API body for `POST /{phone-number-id}/messages`, or null when the link does not
 * start with the site's address (the template's button could not carry it, so SMS goes instead).
 */
const toWhatsappPayload = (
  message: WhatsappMessage,
  options: { to: string; language: string; webUrl: string },
): WhatsappPayload | null => {
  const base = `${options.webUrl.replace(/\/$/, '')}/`
  if (!message.url.startsWith(base)) return null
  const suffix = message.url.slice(base.length)
  if (!suffix) return null

  return {
    messaging_product: 'whatsapp',
    // Cloud API takes the number without the plus.
    to: options.to.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: message.template,
      language: { code: options.language },
      components: [
        {
          type: 'body',
          parameters: message.params.map((text) => ({ type: 'text', text: cleanParam(text) })),
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: suffix }],
        },
      ],
    },
  }
}

/** The text a client sees, for the log driver: the template with its parameters filled in. */
const renderWhatsapp = (message: WhatsappMessage) => {
  const template = WHATSAPP_TEMPLATES[message.template]
  const body = template.body.replace(/\{\{(\d+)\}\}/g, (_, index: string) =>
    cleanParam(message.params[Number(index) - 1] ?? ''),
  )
  return `${body} [${template.button}: ${message.url}]`
}

export type { WhatsappMessage, WhatsappPayload, WhatsappTemplate }
export {
  renderWhatsapp,
  toWhatsappPayload,
  WHATSAPP_TEMPLATES,
  whatsappConfirmation,
  whatsappReminder,
  whatsappReschedule,
  whatsappReturnVisit,
  whatsappReviewRequest,
  whatsappSalonCancellation,
  whatsappWaitlistFreed,
}
