import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { BookingChannel, FunnelFlow, FunnelSegment, FunnelStep } from '@/shared/api/types'

// Words for the codes the funnel telemetry stores (apps/api/src/telemetry/telemetry.schemas.ts).

const FLOW_LABELS: Record<Exclude<FunnelFlow, 'signals'>, MessageDescriptor> = {
  booking: msg`Booking`,
  search: msg`Search`,
  login: msg`Sign-in`,
  manage_booking: msg`Ticket and cancellation`,
  prepayment: msg`Deposit`,
  waitlist: msg`Waitlist`,
  review: msg`Review`,
  owner: msg`Owners`,
}

const STEP_LABELS: Record<FunnelStep, MessageDescriptor> = {
  catalog: msg`Opened the catalogue`,
  business: msg`Opened a place`,
  booking_open: msg`Opened booking`,
  service: msg`Picked a service`,
  specialist: msg`Picked a specialist`,
  time: msg`Picked a time`,
  contacts: msg`Entered contacts`,
  booked: msg`Booked`,
  search_open: msg`Opened search`,
  search_typed: msg`Started typing`,
  search_results: msg`Saw results`,
  search_pick: msg`Opened a result`,
  login_open: msg`Opened sign-in`,
  otp_sent: msg`Got a code`,
  otp_ok: msg`Confirmed the number`,
  login_done: msg`Signed in`,
  ticket_open: msg`Opened the ticket`,
  reschedule_open: msg`Started rescheduling`,
  reschedule_done: msg`Rescheduled`,
  cancel: msg`Cancelled`,
  cancel_undone: msg`Restored a cancelled one`,
  deposit_shown: msg`Saw the deposit terms`,
  checkout_open: msg`Opened payment`,
  pay_click: msg`Tapped “Pay”`,
  paid: msg`Paid`,
  full_day_shown: msg`Hit a fully booked day`,
  waitlist_open: msg`Opened the waitlist`,
  waitlist_joined: msg`Joined the waitlist`,
  review_open: msg`Opened a review`,
  review_rated: msg`Gave a rating`,
  review_sent: msg`Sent a review`,
  business_landing: msg`Opened “For business”`,
  register_name: msg`Step 1: name`,
  register_kind: msg`Step 2: business type`,
  register_services: msg`Step 3: services`,
  register_contacts: msg`Step 4: contacts`,
  register_done: msg`Created a page`,
  form_error: msg`Field error`,
  toast_action: msg`Tapped in a notification`,
  search_empty: msg`Search with no results`,
  otp_error: msg`Wrong code`,
  pay_failed: msg`Payment failed`,
}

// `meta` codes: which field, which toast action, which channel.
const VALUE_LABELS: Record<string, MessageDescriptor | undefined> = {
  phone: msg`Phone`,
  name: msg`Name`,
  rating: msg`Rating in a review`,
  waitlist_name: msg`Name in the waitlist`,
  waitlist_phone: msg`Phone in the waitlist`,
  business_name: msg`Business name`,
  business_slug: msg`Business page address`,
  undo_cancel: msg`“Undo” on a cancelled booking`,
  staff_undo_cancel: msg`Dashboard: "Undo" a cancellation`,
  staff_undo_move: msg`Dashboard: "Undo" a move`,
  staff_undo_close_day: msg`Dashboard: "Undo" on "Everyone came"`,
  sms: msg`SMS`,
  telegram: msg`Telegram`,
}

type SegmentKey = keyof FunnelSegment

const SEGMENT_LABELS: Record<
  SegmentKey,
  { title: MessageDescriptor; values: Record<string, MessageDescriptor | undefined> }
> = {
  type: {
    title: msg`Device`,
    values: { phone: msg`Phone`, tablet: msg`Tablet`, desktop: msg`Computer` },
  },
  textScale: {
    title: msg`Browser font size`,
    values: { normal: msg`Normal`, large: msg`Large`, huge: msg`Very large` },
  },
  net: {
    title: msg`Network`,
    values: { slow: msg`Slow`, fast: msg`Fast`, unknown: msg`Unknown` },
  },
  os: {
    title: msg`System`,
    values: { ios: msg`iOS`, android: msg`Android`, other: msg`Other` },
  },
  app: {
    title: msg`Source`,
    values: { web: msg`Website`, native: msg`App` },
  },
}

// The cuts offered over the funnel: the ones that say most about the personas.
const FILTER_KEYS: SegmentKey[] = ['type', 'textScale', 'net']

export type { SegmentKey }
const CHANNEL_LABELS: Record<BookingChannel, MessageDescriptor> = {
  catalog: msg`Catalogue`,
  for_you: msg`“For you”`,
  feed: msg`“Looks”`,
  search: msg`Search`,
  map: msg`Map`,
  salon_link: msg`Salon’s link`,
  other: msg`Other`,
}

export { CHANNEL_LABELS, FILTER_KEYS, FLOW_LABELS, SEGMENT_LABELS, STEP_LABELS, VALUE_LABELS }
