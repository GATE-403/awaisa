import { describe, expect, it } from 'vitest'
import { blockState } from '../blockState'
import { at, booking } from './fixtures'

const visit = booking('12:00', 60)
const FROM = at('12:00')
const TO = at('13:00')

describe('blockState', () => {
  it('a visit ahead waits', () => {
    expect(blockState(visit, FROM, TO, at('11:00'), false)).toEqual({
      tone: 'plain',
      label: 'Ждём',
    })
    // Another day ahead: no clock at all.
    expect(blockState(visit, FROM, TO, null, false).label).toBe('Ждём')
  })

  it('a visit under way is «Сейчас»', () => {
    expect(blockState(visit, FROM, TO, at('12:30'), false)).toEqual({
      tone: 'accent',
      label: 'Сейчас',
    })
    expect(blockState(visit, FROM, TO, FROM, false).label).toBe('Сейчас')
  })

  it('an ended visit nobody marked asks to be marked, on today and on past days', () => {
    expect(blockState(visit, FROM, TO, TO, false)).toEqual({ tone: 'warning', label: 'Не отмечен' })
    expect(blockState(visit, FROM, TO, null, true).label).toBe('Не отмечен')
  })

  it('the outcome wins over the clock', () => {
    const arrived = booking('12:00', 60, { outcome: 'arrived' })
    const missed = booking('12:00', 60, { outcome: 'no_show' })
    expect(blockState(arrived, FROM, TO, null, true)).toEqual({ tone: 'success', label: 'Пришёл' })
    expect(blockState(missed, FROM, TO, null, true)).toEqual({ tone: 'danger', label: 'Не пришёл' })
  })

  it('cancelled and unpaid visits step back whatever the time', () => {
    const cancelled = booking('12:00', 60, { status: 'cancelled', outcome: 'arrived' })
    const unpaid = booking('12:00', 60, {
      payment: { status: 'pending', amount: 500 } as never,
    })
    expect(blockState(cancelled, FROM, TO, at('12:30'), false)).toEqual({
      tone: 'muted',
      label: 'Отменена',
    })
    expect(blockState(unpaid, FROM, TO, null, true).label).toBe('Ждёт оплату')
  })
})
