import { describe, expect, it } from 'vitest'
import { cheaperThan } from '../lib/cheaperThan'

describe('cheaperThan', () => {
  it('rounds a low price down to whole tens', () => {
    expect(cheaperThan(73)).toBe(70)
    expect(cheaperThan(100)).toBe(100)
    expect(cheaperThan(60)).toBe(60)
  })

  it('says nothing about an ordinary price or when there is nothing to compare', () => {
    expect(cheaperThan(59)).toBeNull()
    expect(cheaperThan(0)).toBeNull()
    expect(cheaperThan(null)).toBeNull()
    expect(cheaperThan(undefined)).toBeNull()
  })
})
