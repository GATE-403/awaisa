import { describe, expect, it } from 'vitest'
import { bookingEvent, type FeedBooking, type FeedOptions, hidePhone } from './calendar-events.js'

const booking: FeedBooking = {
  id: 'b1',
  startsAt: new Date('2026-11-22T09:00:00.000Z'),
  endsAt: new Date('2026-11-22T09:45:00.000Z'),
  status: 'confirmed',
  paymentStatus: null,
  serviceName: "Men's haircut",
  specialistName: 'Erlan',
  customerName: 'Aibek',
  customerPhone: '+996555123456',
  comment: '',
  branchName: 'Centre',
  branchAddress: '95 Kievskaya St',
  price: 1500,
  discountAmount: null,
}

const options: FeedOptions = {
  isMasterNamed: false,
  isPhoneShown: false,
  webUrl: 'https://awaisa.kg',
  slug: 'old-school',
  audience: 'master',
}

describe('hidePhone', () => {
  it('keeps only the last three digits', () => {
    expect(hidePhone('+996555123456')).toBe('+996 ••• ••• 456')
  })
})

describe('bookingEvent', () => {
  it('says the service and the client, with a stable UID, the branch and its address', () => {
    const event = bookingEvent(booking, options)

    expect(event.uid).toBe('booking-b1@awaisa.kg')
    expect(event.summary).toBe("Men's haircut · Aibek")
    expect(event.location).toBe('Centre, 95 Kievskaya St')
    expect(event.url).toBe('https://awaisa.kg/master/old-school?date=2026-11-22')
  })

  it('hides the phone unless the owner turned whole numbers on', () => {
    expect(bookingEvent(booking, options).description).toContain('Aibek, +996 ••• ••• 456')
    expect(bookingEvent(booking, options).description).not.toContain('123')
    expect(bookingEvent(booking, { ...options, isPhoneShown: true }).description).toContain(
      '+996 555 123 456',
    )
  })

  it('names the master in a feed of every master and links to the cabinet', () => {
    const event = bookingEvent(booking, { ...options, isMasterNamed: true, audience: 'business' })

    expect(event.summary).toBe("Men's haircut · Aibek · Erlan")
    expect(event.url).toBe(
      'https://awaisa.kg/manage/old-school?tab=schedule&date=2026-11-22&booking=b1',
    )
  })

  it('marks a cancelled visit and an unpaid hold', () => {
    const cancelled = bookingEvent({ ...booking, status: 'cancelled' }, options)
    expect(cancelled.isCancelled).toBe(true)
    expect(cancelled.summary).toBe("Cancelled: Men's haircut · Aibek")

    expect(bookingEvent({ ...booking, paymentStatus: 'pending' }, options).isTentative).toBe(true)
  })

  it('shows the price after the discount and the comment', () => {
    const event = bookingEvent(
      { ...booking, discountAmount: 300, comment: 'A bit shorter' },
      options,
    )

    expect(event.description).toContain('Price: 1,200 som')
    expect(event.description).toContain('Comment: A bit shorter')
  })

  it('takes the visit day on Bishkek time for the link', () => {
    const late = { ...booking, startsAt: new Date('2026-11-22T19:00:00.000Z') }
    expect(bookingEvent(late, options).url).toContain('date=2026-11-23')
  })
})
