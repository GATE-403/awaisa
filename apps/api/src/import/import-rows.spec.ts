import { describe, expect, it } from 'vitest'
import { matchByName, parseDate, parseTime } from './import-rows.js'

describe('parseDate', () => {
  it('reads the formats exports use', () => {
    expect(parseDate('15.11.2026')).toBe('2026-11-15')
    expect(parseDate('5/1/2027')).toBe('2027-01-05')
    expect(parseDate('15-11-26')).toBe('2026-11-15')
    expect(parseDate('2026-11-15')).toBe('2026-11-15')
    expect(parseDate('15.11.2026 14:30')).toBe('2026-11-15')
  })

  it('refuses what is not a date', () => {
    expect(parseDate('31.02.2026')).toBeNull()
    expect(parseDate('завтра')).toBeNull()
    expect(parseDate('')).toBeNull()
  })
})

describe('parseTime', () => {
  it('reads times alone or after a date', () => {
    expect(parseTime('9:30')).toBe('09:30')
    expect(parseTime('14.00')).toBe('14:00')
    expect(parseTime('14:00:00')).toBe('14:00')
    expect(parseTime('15.11.2026 14:30')).toBe('14:30')
  })

  it('refuses impossible times', () => {
    expect(parseTime('25:00')).toBeNull()
    expect(parseTime('15.11.2026')).toBeNull()
  })
})

describe('matchByName', () => {
  const services = [{ name: 'Стрижка' }, { name: 'Окрашивание «Шатуш»' }, { name: 'Укладка' }]
  const masters = [{ name: 'Айгерим Токтогулова' }, { name: 'Данияр Асанов' }]

  it('ignores case, ё and quotes', () => {
    expect(matchByName(services, '  СТРИЖКА ')).toBe(services[0])
    expect(matchByName(services, 'окрашивание шатуш')).toBe(services[1])
  })

  it('takes the first known service of several', () => {
    expect(matchByName(services, 'Маникюр, Укладка')).toBe(services[2])
  })

  it('finds a master by a unique first name', () => {
    expect(matchByName(masters, 'данияр')).toBe(masters[1])
    expect(matchByName(masters, 'Асель')).toBeNull()
  })
})
