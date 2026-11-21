import { describe, expect, it } from 'vitest'
import {
  ANONYMOUS_AUTHOR,
  anonymizeReview,
  bookingsToCancel,
  soleOwnedBusinesses,
  soleOwnerMessage,
} from './account-erasure.js'

const review = {
  id: 'r1',
  rating: 5,
  comment: 'Отлично',
  authorName: 'Айгерим С.',
  authorId: '0123456789abcdef0123',
  authorAvatarUrl: '/api/media/customers/a.webp',
  authorRank: 2,
  reply: 'Спасибо!',
}

describe('anonymizeReview', () => {
  it('keeps the words, the stars and the reply but drops the person', () => {
    expect(anonymizeReview(review, true)).toEqual({
      ...review,
      authorName: ANONYMOUS_AUTHOR,
      authorId: null,
      authorAvatarUrl: null,
      authorRank: null,
    })
  })

  it('leaves a review of a living account as it is', () => {
    expect(anonymizeReview(review, false)).toBe(review)
  })

  it('does not add a wreath field where the view has none', () => {
    const { authorRank: _rank, ...plain } = review
    expect(anonymizeReview(plain, true)).not.toHaveProperty('authorRank')
  })
})

describe('soleOwnedBusinesses', () => {
  it('names only businesses where the account is the one owner', () => {
    expect(
      soleOwnedBusinesses([
        { businessName: 'Барбершоп', role: 'owner', owners: 1 },
        { businessName: 'Салон', role: 'owner', owners: 2 },
        { businessName: 'Студия', role: 'staff', owners: 1 },
      ]),
    ).toEqual(['Барбершоп'])
  })

  it('lets staff and clients go', () => {
    expect(soleOwnedBusinesses([{ businessName: 'Студия', role: 'staff', owners: 1 }])).toEqual([])
  })

  it('explains what to do first', () => {
    expect(soleOwnerMessage(['Барбершоп'])).toContain('единственный владелец «Барбершоп»')
    expect(soleOwnerMessage(['А', 'Б'])).toContain('«А», «Б»')
  })
})

describe('bookingsToCancel', () => {
  const now = new Date('2026-11-21T10:00:00Z')

  it('cancels only confirmed visits that have not started', () => {
    expect(
      bookingsToCancel(
        [
          { id: 'ahead', status: 'confirmed', startsAt: new Date('2026-11-22T10:00:00Z') },
          { id: 'past', status: 'confirmed', startsAt: new Date('2026-11-20T10:00:00Z') },
          { id: 'now', status: 'confirmed', startsAt: now },
          { id: 'gone', status: 'cancelled', startsAt: new Date('2026-11-23T10:00:00Z') },
        ],
        now,
      ),
    ).toEqual(['ahead'])
  })
})
