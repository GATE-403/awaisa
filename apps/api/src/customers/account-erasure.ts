// What deleting an account keeps and what it takes away (pure, unit-tested).
//
// Reviews stay with the places (their rating and replies are the places' too) but lose the
// person: the name becomes 'Client', no face, no public id and no wreath. Bookings stay with the
// businesses (their books) but are no longer the account's. Visits still ahead are cancelled.

const ANONYMOUS_AUTHOR = 'Client'

type ReviewAuthor = {
  authorName: string
  authorId?: string | null
  authorAvatarUrl?: string | null
  authorRank?: number | null
}

/** A review as the public sees it once its author deleted the account. */
const anonymizeReview = <T extends ReviewAuthor>(review: T, isAnonymous: boolean): T =>
  isAnonymous
    ? {
        ...review,
        authorName: ANONYMOUS_AUTHOR,
        authorId: null,
        authorAvatarUrl: null,
        ...('authorRank' in review ? { authorRank: null } : {}),
      }
    : review

type Membership = { businessName: string; role: string; owners: number }

/** Businesses that would be left without an owner: the account cannot go while there are any. */
const soleOwnedBusinesses = (memberships: Membership[]) =>
  memberships
    .filter((membership) => membership.role === 'owner' && membership.owners <= 1)
    .map((membership) => membership.businessName)

const soleOwnerMessage = (names: string[]) =>
  names.length === 1
    ? `You are the only owner of “${names[0]}”. Hand the business over to another owner first, then delete your account.`
    : `You are the only owner of ${names.map((name) => `“${name}”`).join(', ')}. Hand the businesses over to other owners first, then delete your account.`

type UpcomingBooking = { id: string; status: string; startsAt: Date }

/** The visits that are cancelled with the account: confirmed and not started yet. */
const bookingsToCancel = (bookings: UpcomingBooking[], now: Date) =>
  bookings
    .filter((booking) => booking.status === 'confirmed' && booking.startsAt > now)
    .map((booking) => booking.id)

export {
  ANONYMOUS_AUTHOR,
  anonymizeReview,
  bookingsToCancel,
  soleOwnedBusinesses,
  soleOwnerMessage,
}
