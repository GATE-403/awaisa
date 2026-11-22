import { describe, expect, it } from 'vitest'
import { dayWords, freedText, movedText, worksText } from './follow-messages.js'

describe('follow messages', () => {
  it('names the day in words', () => {
    expect(dayWords('2026-11-22', '2026-11-22', '2026-11-23')).toBe('сегодня')
    expect(dayWords('2026-11-23', '2026-11-22', '2026-11-23')).toBe('завтра')
    expect(dayWords('2026-12-01', '2026-11-22', '2026-11-23')).toBe('1 декабря')
  })

  it('says who freed up when, by first name, with the link', () => {
    expect(freedText('Азамат Беков', 'Old School', 'завтра', '11:00', 'https://a.kg/x')).toBe(
      'Азамат, Old School: освободилось завтра в 11:00. Записаться: https://a.kg/x',
    )
    expect(movedText('Азамат Беков', 'Boroda', 'https://a.kg/b')).toBe(
      'Азамат теперь работает в «Boroda». Записаться: https://a.kg/b',
    )
  })

  it('counts new works in Russian', () => {
    expect(worksText('Азамат', 1, 'L')).toBe('Азамат: 1 новая работа в «Образах». Смотреть: L')
    expect(worksText('Азамат', 3, 'L')).toBe('Азамат: 3 новые работы в «Образах». Смотреть: L')
    expect(worksText('Азамат', 11, 'L')).toBe('Азамат: 11 новых работ в «Образах». Смотреть: L')
  })
})
