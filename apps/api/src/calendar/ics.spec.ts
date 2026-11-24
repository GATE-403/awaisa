import { describe, expect, it } from 'vitest'
import { buildCalendar, escapeText, foldLine, formatLocal, formatUtc } from './ics.js'

const octets = (line: string) => new TextEncoder().encode(line).length

describe('escapeText', () => {
  it('escapes backslashes, semicolons, commas and line breaks', () => {
    expect(escapeText('a\\b; c, d\ne\r\nf')).toBe('a\\\\b\\; c\\, d\\ne\\nf')
  })

  it('leaves colons and Cyrillic as they are', () => {
    expect(escapeText('Стрижка: 15:00')).toBe('Стрижка: 15:00')
  })
})

describe('foldLine', () => {
  it('keeps a short line whole', () => {
    expect(foldLine('SUMMARY:Стрижка')).toBe('SUMMARY:Стрижка')
  })

  it('folds at 75 octets with a leading space on each continuation', () => {
    const line = `DESCRIPTION:${'a'.repeat(200)}`
    const parts = foldLine(line).split('\r\n')

    expect(parts.length).toBeGreaterThan(2)
    for (const part of parts) expect(octets(part)).toBeLessThanOrEqual(75)
    expect(parts.slice(1).every((part) => part.startsWith(' '))).toBe(true)
    expect(parts.map((part, index) => (index ? part.slice(1) : part)).join('')).toBe(line)
  })

  it('never cuts a two-octet Cyrillic letter in half', () => {
    const line = `SUMMARY:${'ж'.repeat(100)}`
    const parts = foldLine(line).split('\r\n')

    for (const part of parts) {
      expect(octets(part)).toBeLessThanOrEqual(75)
      expect(part).not.toContain('�')
    }
    expect(parts.map((part, index) => (index ? part.slice(1) : part)).join('')).toBe(line)
  })

  it('keeps an emoji (four octets, two UTF-16 units) whole', () => {
    const line = `SUMMARY:${'🙂'.repeat(40)}`
    const parts = foldLine(line).split('\r\n')

    for (const part of parts) expect(octets(part)).toBeLessThanOrEqual(75)
    expect(parts.map((part, index) => (index ? part.slice(1) : part)).join('')).toBe(line)
  })
})

describe('dates', () => {
  const moment = new Date('2026-11-21T09:30:00.000Z')

  it('writes UTC with Z', () => {
    expect(formatUtc(moment)).toBe('20261121T093000Z')
  })

  it('writes Bishkek local time (UTC+6), across midnight too', () => {
    expect(formatLocal(moment)).toBe('20261121T153000')
    expect(formatLocal(new Date('2026-11-21T20:15:00.000Z'))).toBe('20261122T021500')
  })
})

describe('buildCalendar', () => {
  const calendar = buildCalendar({
    name: 'Erlan · Old School',
    refreshMinutes: 15,
    now: new Date('2026-11-21T06:00:00.000Z'),
    events: [
      {
        uid: 'booking-1@awaisa.kg',
        start: new Date('2026-11-22T09:00:00.000Z'),
        end: new Date('2026-11-22T09:45:00.000Z'),
        summary: "Men's haircut · Aibek",
        location: 'Centre, 95 Kievskaya St',
        description: 'Client: Aibek\nSpecialist: Erlan',
      },
      {
        uid: 'booking-2@awaisa.kg',
        start: new Date('2026-11-23T09:00:00.000Z'),
        end: new Date('2026-11-23T10:00:00.000Z'),
        summary: 'Beard',
        isCancelled: true,
      },
    ],
  })
  const lines = calendar.split('\r\n')

  it('is a VCALENDAR with CRLF line ends and a closing CRLF', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(calendar.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(calendar.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
  })

  it('names the calendar and asks to be refreshed', () => {
    expect(lines).toContain('X-WR-CALNAME:Erlan · Old School')
    expect(lines).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT15M')
    expect(lines).toContain('TZID:Asia/Bishkek')
  })

  it('writes each visit on Bishkek time with a stable UID and escaped text', () => {
    expect(lines).toContain('UID:booking-1@awaisa.kg')
    expect(lines).toContain('DTSTART;TZID=Asia/Bishkek:20261122T150000')
    expect(lines).toContain('DTEND;TZID=Asia/Bishkek:20261122T154500')
    expect(lines).toContain('LOCATION:Centre\\, 95 Kievskaya St')
    expect(lines).toContain('DESCRIPTION:Client: Aibek\\nSpecialist: Erlan')
    expect(lines).toContain('DTSTAMP:20261121T060000Z')
  })

  it('marks a cancelled visit CANCELLED and frees the time', () => {
    const second = lines.slice(lines.indexOf('UID:booking-2@awaisa.kg'))
    expect(second).toContain('STATUS:CANCELLED')
    expect(second).toContain('TRANSP:TRANSPARENT')
    expect(lines.slice(0, lines.indexOf('UID:booking-2@awaisa.kg'))).toContain('STATUS:CONFIRMED')
  })
})
