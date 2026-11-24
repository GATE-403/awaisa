import fromPullRequests from './updates.json'

// What's new (`/updates`): the newest first. Add an entry when a change is felt by people -
// not for refactors or CI. Usually through the PR: its "## What's new" section is copied into
// `updates.json` when it merges (`.github/workflows/updates.yml`). `id` must be new each time: it
// marks the entry as read.
type UpdateAudience = 'clients' | 'business' | 'everyone'

type UpdateEntry = {
  id: string
  /** Day key, YYYY-MM-DD. */
  date: string
  audience: UpdateAudience
  title: string
  text: string
  /** Where to try it. */
  link?: { href: string; label: string }
}

const WRITTEN_BY_HAND: UpdateEntry[] = [
  {
    id: '2026-11-19-hold-to-delete',
    date: '2026-11-19',
    audience: 'business',
    title: 'Hold to cancel or delete',
    text: 'To cancel a booking or delete a photo, promotion, branch, stock item or membership, hold the red button for a second. An accidental tap no longer deletes anything.',
  },
  {
    id: '2026-11-19-booking-ticket',
    date: '2026-11-19',
    audience: 'business',
    title: 'Bookings in the dashboard look like a ticket',
    text: 'Open a booking in the schedule: the day, time, service, the client with call and WhatsApp, and the amount to pay, all on one ticket, just like the client sees it.',
  },
  {
    id: '2026-11-19-cabinet-head',
    date: '2026-11-19',
    audience: 'business',
    title: 'A more compact dashboard',
    text: 'The name, sections and buttons now sit in one row at the top, so the schedule shows straight away without scrolling.',
  },
  {
    id: '2026-11-18-sign-in',
    date: '2026-11-18',
    audience: 'everyone',
    title: 'New sign-in',
    text: 'Sign in with your number or through Telegram on one screen, and you are greeted by name once you are in.',
    link: { href: '/login', label: 'Sign in' },
  },
  {
    id: '2026-11-18-schedule-cards',
    date: '2026-11-18',
    audience: 'business',
    title: 'The schedule at a glance',
    text: 'Each booking is a card with the client, service and status: “Expected”, “Now”, “Mark”. “Break” blocks off time, and “All arrived” marks past visits in one tap.',
  },
  {
    id: '2026-11-18-analytics-charts',
    date: '2026-11-18',
    audience: 'business',
    title: 'Analytics with charts',
    text: "Daily revenue next to the same period before, payment shares and specialists' load, with details for each day.",
  },
  {
    id: '2026-11-18-page-tab',
    date: '2026-11-18',
    audience: 'business',
    title: 'Edit your business page in place',
    text: 'On the Page tab, change the cover, logo, name and description right where clients see them.',
  },
  {
    id: '2026-11-18-client-card',
    date: '2026-11-18',
    audience: 'business',
    title: 'Client card',
    text: 'Visits, spend, usual service and specialist, next visit and birthday, kept short with no empty rows. You can rebook the client from there too.',
  },
  {
    id: '2026-11-18-price-on-ticket',
    date: '2026-11-18',
    audience: 'clients',
    title: 'The amount to pay, front and centre',
    text: "After booking, the price shows straight away on the ticket and on the “You're booked” screen. Discounts and any deposit are already taken off.",
    link: { href: '/bookings', label: 'My bookings' },
  },
  {
    id: '2026-11-18-tab-bar',
    date: '2026-11-18',
    audience: 'clients',
    title: 'More room on your phone screen',
    text: 'The bottom menu tucks away while you scroll down and comes back as soon as you scroll up.',
  },
  {
    id: '2026-11-18-outage',
    date: '2026-11-18',
    audience: 'everyone',
    title: 'Pages open even during an outage',
    text: 'If something breaks on our side, place pages and the catalogue show their last saved version instead of a blank screen.',
  },
  {
    id: '2026-11-17-large-text',
    date: '2026-11-17',
    audience: 'everyone',
    title: 'Large text and zoom',
    text: 'With large system text or the page zoomed to 200%, nothing gets cut off: the booking status, address, “Today” and “Tomorrow” show in full.',
  },
  {
    id: '2026-11-17-looks',
    date: '2026-11-17',
    audience: 'clients',
    title: 'Looks as a deck',
    text: "Swipe through specialists' finished work and book the one whose work you like.",
    link: { href: '/feed', label: 'Open Looks' },
  },
  {
    id: '2026-11-16-telegram-login',
    date: '2026-11-16',
    audience: 'everyone',
    title: 'Sign in with Telegram',
    text: 'Sign in without SMS: confirm your number in our bot. It is the same account as with SMS.',
    link: { href: '/login', label: 'Sign in' },
  },
  {
    id: '2026-11-16-booking-stack',
    date: '2026-11-16',
    audience: 'clients',
    title: 'Booking step by step',
    text: 'Your chosen service, specialist and time stack up as cards above the next step. Tap the stack to change something.',
  },
]

// Newest day first; within a day the merged PRs' entries lead, in the order they were written.
const UPDATES: UpdateEntry[] = [...(fromPullRequests as UpdateEntry[]), ...WRITTEN_BY_HAND].sort(
  (a, b) => b.date.localeCompare(a.date),
)

const LATEST_UPDATE_ID = UPDATES[0]?.id ?? ''

export type { UpdateAudience, UpdateEntry }
export { LATEST_UPDATE_ID, UPDATES }
