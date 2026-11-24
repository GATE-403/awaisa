import { describe, expect, it } from 'vitest'
import { dayWords, freedText, movedText, worksText } from './follow-messages.js'

describe('follow messages', () => {
  it('names the day in words', () => {
    expect(dayWords('2026-11-22', '2026-11-22', '2026-11-23')).toBe('today')
    expect(dayWords('2026-11-23', '2026-11-22', '2026-11-23')).toBe('tomorrow')
    expect(dayWords('2026-12-01', '2026-11-22', '2026-11-23')).toBe('1 December')
  })

  it('says who freed up when, by first name, with the link', () => {
    expect(freedText('Azamat Bekov', 'Old School', 'tomorrow', '11:00', 'https://a.kg/x')).toBe(
      'Azamat, Old School: a slot opened up tomorrow at 11:00. Book: https://a.kg/x',
    )
    expect(movedText('Azamat Bekov', 'Boroda', 'https://a.kg/b')).toBe(
      'Azamat now works at “Boroda”. Book: https://a.kg/b',
    )
  })

  it('counts new works in English', () => {
    expect(worksText('Azamat', 1, 'L')).toBe('Azamat: 1 new look in “Looks”. See them: L')
    expect(worksText('Azamat', 3, 'L')).toBe('Azamat: 3 new looks in “Looks”. See them: L')
  })
})
