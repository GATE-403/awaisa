import type { BookingChannel, FunnelFlow, FunnelSegment, FunnelStep } from '@/shared/api/types'

// Words for the codes the funnel telemetry stores (apps/api/src/telemetry/telemetry.schemas.ts).

const FLOW_LABELS: Record<Exclude<FunnelFlow, 'signals'>, string> = {
  booking: 'Booking',
  search: 'Search',
  login: 'Sign-in',
  manage_booking: 'Ticket and cancellation',
  prepayment: 'Deposit',
  waitlist: 'Waitlist',
  review: 'Review',
  owner: 'Owners',
}

const STEP_LABELS: Record<FunnelStep, string> = {
  catalog: 'Opened the catalogue',
  business: 'Opened a place',
  booking_open: 'Opened booking',
  service: 'Picked a service',
  specialist: 'Picked a specialist',
  time: 'Picked a time',
  contacts: 'Entered contacts',
  booked: 'Booked',
  search_open: 'Opened search',
  search_typed: 'Started typing',
  search_results: 'Saw results',
  search_pick: 'Opened a result',
  login_open: 'Opened sign-in',
  otp_sent: 'Got a code',
  otp_ok: 'Confirmed the number',
  login_done: 'Signed in',
  ticket_open: 'Opened the ticket',
  reschedule_open: 'Started rescheduling',
  reschedule_done: 'Rescheduled',
  cancel: 'Cancelled',
  cancel_undone: 'Restored a cancelled one',
  deposit_shown: 'Saw the deposit terms',
  checkout_open: 'Opened payment',
  pay_click: 'Tapped "Pay"',
  paid: 'Paid',
  full_day_shown: 'Hit a fully booked day',
  waitlist_open: 'Opened the waitlist',
  waitlist_joined: 'Joined the waitlist',
  review_open: 'Opened a review',
  review_rated: 'Gave a rating',
  review_sent: 'Sent a review',
  business_landing: 'Opened "For business"',
  register_name: 'Step 1: name',
  register_kind: 'Step 2: business type',
  register_services: 'Step 3: services',
  register_contacts: 'Step 4: contacts',
  register_done: 'Created a page',
  form_error: 'Field error',
  toast_action: 'Tapped in a notification',
  search_empty: 'Search with no results',
  otp_error: 'Wrong code',
  pay_failed: 'Payment failed',
}

// `meta` codes: which field, which toast action, which channel.
const VALUE_LABELS: Record<string, string> = {
  phone: 'Phone',
  name: 'Name',
  rating: 'Rating in a review',
  waitlist_name: 'Name in the waitlist',
  waitlist_phone: 'Phone in the waitlist',
  business_name: 'Business name',
  business_slug: 'Business page address',
  undo_cancel: '"Undo" on a cancelled booking',
  staff_undo_cancel: 'Dashboard: "Undo" a cancellation',
  staff_undo_move: 'Dashboard: "Undo" a move',
  staff_undo_close_day: 'Dashboard: "Undo" on "Everyone came"',
  sms: 'SMS',
  telegram: 'Telegram',
}

type SegmentKey = keyof FunnelSegment

const SEGMENT_LABELS: Record<SegmentKey, { title: string; values: Record<string, string> }> = {
  type: {
    title: 'Device',
    values: { phone: 'Phone', tablet: 'Tablet', desktop: 'Computer' },
  },
  textScale: {
    title: 'Browser font size',
    values: { normal: 'Normal', large: 'Large', huge: 'Very large' },
  },
  net: {
    title: 'Network',
    values: { slow: 'Slow', fast: 'Fast', unknown: 'Unknown' },
  },
  os: {
    title: 'System',
    values: { ios: 'iOS', android: 'Android', other: 'Other' },
  },
  app: {
    title: 'Source',
    values: { web: 'Website', native: 'App' },
  },
}

// The cuts offered over the funnel: the ones that say most about the personas.
const FILTER_KEYS: SegmentKey[] = ['type', 'textScale', 'net']

export type { SegmentKey }
const CHANNEL_LABELS: Record<BookingChannel, string> = {
  catalog: 'Catalogue',
  for_you: '"For you"',
  feed: '"Looks"',
  search: 'Search',
  map: 'Map',
  salon_link: 'Salon’s link',
  other: 'Other',
}

export { CHANNEL_LABELS, FILTER_KEYS, FLOW_LABELS, SEGMENT_LABELS, STEP_LABELS, VALUE_LABELS }
