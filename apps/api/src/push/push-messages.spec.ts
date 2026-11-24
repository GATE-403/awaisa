import { describe, expect, it } from 'vitest'
import { bookingPushMessage, type PushBooking } from './push-messages.js'

const booking: PushBooking = {
  id: 'b1',
  date: '2026-11-26',
  time: '14:30',
  serviceName: "Men's haircut",
  specialistName: 'Erlan',
  customerName: 'Aibek Toktogulov',
  business: { slug: 'old-school', name: 'Old School' },
}

// 2026-11-26 is a Thursday.
const TODAY = '2026-11-21'

describe('bookingPushMessage', () => {
  it('says what, when and who for a master, opening their day', () => {
    expect(bookingPushMessage('created', booking, 'master', TODAY)).toEqual({
      title: 'New booking',
      body: "Thu 14:30 · Men's haircut · Aibek",
      url: '/master/old-school?date=2026-11-26',
      tag: 'b1',
    })
  })

  it('adds the master and the place for the business and opens the booking in the schedule', () => {
    const message = bookingPushMessage('created', booking, 'member', TODAY)

    expect(message.body).toBe("Thu 14:30 · Men's haircut · Aibek\nErlan · Old School")
    expect(message.url).toBe('/manage/old-school?tab=schedule&date=2026-11-26&booking=b1')
  })

  it('names the date when the visit is more than a week away', () => {
    const message = bookingPushMessage(
      'created',
      { ...booking, date: '2026-12-03' },
      'master',
      TODAY,
    )

    expect(message.body).toBe("Thu 3 Dec 14:30 · Men's haircut · Aibek")
  })

  it('tells a move with the old time and a cancellation by its title', () => {
    const moved = bookingPushMessage(
      'moved',
      { ...booking, previous: '2026-11-25 10:00' },
      'master',
      TODAY,
    )
    expect(moved.title).toBe('Client moved a booking')
    expect(moved.body).toBe("Thu 14:30 · Men's haircut · Aibek\nWas: Wed 10:00")

    expect(bookingPushMessage('cancelled', booking, 'master', TODAY).title).toBe(
      'Client cancelled a booking',
    )
  })

  it('keeps the slug safe in the link', () => {
    const message = bookingPushMessage(
      'created',
      { ...booking, business: { slug: 'a b', name: 'X' } },
      'master',
      TODAY,
    )

    expect(message.url).toBe('/master/a%20b?date=2026-11-26')
  })
})
