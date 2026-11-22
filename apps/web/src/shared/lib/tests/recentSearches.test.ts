import { describe, expect, it } from 'vitest'
import { addRecent } from '../recentSearches'

describe('addRecent', () => {
  it('puts the newest first and drops a repeat whatever its case', () => {
    expect(addRecent(['маникюр', 'Стрижка'], 'стрижка')).toEqual(['стрижка', 'маникюр'])
  })

  it('keeps five and ignores an empty query', () => {
    const five = ['1', '2', '3', '4', '5']
    expect(addRecent(five, '6')).toEqual(['6', '1', '2', '3', '4'])
    expect(addRecent(five, '   ')).toBe(five)
  })
})
