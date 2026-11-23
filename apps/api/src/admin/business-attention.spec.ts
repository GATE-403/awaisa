import { describe, expect, it } from 'vitest'
import { setupProgress, todayLoad } from './business-attention.js'

describe('todayLoad', () => {
  it('is the booked share of the open time', () => {
    expect(todayLoad(150, 600)).toBe(0.25)
    expect(todayLoad(200, 600)).toBe(0.33)
  })

  it('stops at full when the day is overbooked', () => {
    expect(todayLoad(700, 600)).toBe(1)
  })

  it('is null on a day off or without masters', () => {
    expect(todayLoad(0, 0)).toBeNull()
  })
})

describe('setupProgress', () => {
  it('names the first step left in the cabinet’s order', () => {
    expect(setupProgress({ services: true, masters: false, hours: true })).toEqual({
      done: 2,
      total: 3,
      next: 'masters',
    })
    expect(setupProgress({ services: false, masters: false, hours: true }).next).toBe('services')
  })

  it('has nothing left once every step is done', () => {
    expect(setupProgress({ services: true, masters: true, hours: true })).toEqual({
      done: 3,
      total: 3,
      next: null,
    })
  })
})
