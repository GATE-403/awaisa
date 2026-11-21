import { describe, expect, it } from 'vitest'
import { bookingPushMessage, type PushBooking } from './push-messages.js'

const booking: PushBooking = {
  id: 'b1',
  date: '2026-11-26',
  time: '14:30',
  serviceName: 'Мужская стрижка',
  specialistName: 'Эрлан',
  customerName: 'Айбек Токтогулов',
  business: { slug: 'old-school', name: 'Old School' },
}

// 2026-11-26 is a Thursday.
const TODAY = '2026-11-21'

describe('bookingPushMessage', () => {
  it('says what, when and who for a master, opening their day', () => {
    expect(bookingPushMessage('created', booking, 'master', TODAY)).toEqual({
      title: 'Новая запись',
      body: 'Чт 14:30 · Мужская стрижка · Айбек',
      url: '/master/old-school?date=2026-11-26',
      tag: 'b1',
    })
  })

  it('adds the master and the place for the business and opens the booking in the schedule', () => {
    const message = bookingPushMessage('created', booking, 'member', TODAY)

    expect(message.body).toBe('Чт 14:30 · Мужская стрижка · Айбек\nЭрлан · Old School')
    expect(message.url).toBe('/manage/old-school?tab=schedule&date=2026-11-26&booking=b1')
  })

  it('names the date when the visit is more than a week away', () => {
    const message = bookingPushMessage(
      'created',
      { ...booking, date: '2026-12-03' },
      'master',
      TODAY,
    )

    expect(message.body).toBe('Чт 3 дек. 14:30 · Мужская стрижка · Айбек')
  })

  it('tells a move with the old time and a cancellation by its title', () => {
    const moved = bookingPushMessage(
      'moved',
      { ...booking, previous: '2026-11-25 10:00' },
      'master',
      TODAY,
    )
    expect(moved.title).toBe('Клиент перенёс запись')
    expect(moved.body).toBe('Чт 14:30 · Мужская стрижка · Айбек\nБыло: Ср 10:00')

    expect(bookingPushMessage('cancelled', booking, 'master', TODAY).title).toBe(
      'Клиент отменил запись',
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
