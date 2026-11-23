// What deleting a business keeps and what it takes away (pure, unit-tested).
//
// Like deleting an account, the books stay: past visits, payments, fiscal receipts, sold
// certificates and subscriptions are tax and money records (and deposits still have to be refunded
// by `settlePayments`), so the business row is archived, not dropped: soft-deleted (`deleted_at`),
// hidden, its address freed and its masters and services switched off. Nobody reaches it in the
// app any more: the team loses access, chats, calendar feeds and followers go. Visits still ahead
// are cancelled the salon's usual way, so clients get the text and deposits come back.

/** Prefix of the address an archived business moves to, so its old one is free to take. */
const ARCHIVED_SLUG_PREFIX = 'deleted-'

/** A unique address for the archive: never a real slug's shape, never taken twice. */
const archivedSlug = (id: string, now: Date) =>
  `${ARCHIVED_SLUG_PREFIX}${id.replace(/-/g, '').slice(0, 12)}-${now.getTime().toString(36)}`

type UpcomingBooking = { id: string; status: string; startsAt: Date }

/** The visits cancelled with the business: confirmed (paid or still on hold) and not started yet. */
const bookingsToCancel = (bookings: UpcomingBooking[], now: Date) =>
  bookings
    .filter((booking) => booking.status === 'confirmed' && booking.startsAt > now)
    .map((booking) => booking.id)

export { ARCHIVED_SLUG_PREFIX, archivedSlug, bookingsToCancel }
