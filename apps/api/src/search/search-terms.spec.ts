import { describe, expect, it } from 'vitest'
import {
  correctQuery,
  editDistance,
  likePatterns,
  normalize,
  readingsOf,
  stemsOf,
  vocabularyOf,
} from './search-terms.js'

const VOCABULARY = vocabularyOf([
  'Женская стрижка',
  'Мужская стрижка',
  'Стрижка машинкой',
  'Маникюр с покрытием',
  'Маникюр без покрытия',
  'Педикюр',
  'Окрашивание корней',
  'Коррекция бровей',
  'Ламинирование ресниц',
  'Оформление бороды',
  'Классический массаж',
  'Lumière',
  'Kings Barbershop',
  'Борода',
])

describe('readingsOf', () => {
  it('lower-cases and folds «ё»', () => {
    expect(readingsOf('  ПРИЧЁСКА!! ')[0]).toBe('прическа')
  })

  it('fixes a query typed on the English layout', () => {
    expect(readingsOf('cnhb;rf')).toContain('стрижка')
  })

  it('reads Latin transliteration', () => {
    expect(readingsOf('strizhka')).toContain('стрижка')
    expect(readingsOf('manikyur')).toContain('маникюр')
  })

  it('reads a Latin name typed on the Russian layout', () => {
    expect(readingsOf('ифкиук')).toContain('barber')
  })
})

describe('stemsOf', () => {
  it('finds other forms of a word', () => {
    expect(stemsOf('стрижку')).toContain('стриж')
    expect(stemsOf('брови')).toContain('бров')
  })

  it('maps everyday words to what services are called', () => {
    expect(stemsOf('ногти')).toContain('маникюр')
    expect(stemsOf('покраска волос')).toContain('окраш')
    expect(stemsOf('подстричься')).toContain('стриж')
    expect(stemsOf('реснички')).toContain('ресниц')
  })

  it('maps English words to Russian and English service names', () => {
    expect(stemsOf('haircut')).toEqual(expect.arrayContaining(['стриж', 'haircut']))
    expect(stemsOf('nails')).toEqual(expect.arrayContaining(['маникюр', 'nail']))
    expect(stemsOf('beard trim')).toContain('бород')
    expect(stemsOf('brows')).toContain('бров')
  })
})

describe('correctQuery', () => {
  it('fixes typos against the site’s own words', () => {
    expect(correctQuery('стришка', VOCABULARY)).toBe('стрижка')
    expect(correctQuery('педекюр', VOCABULARY)).toBe('педикюр')
    expect(correctQuery('стиржка', VOCABULARY)).toBe('стрижка')
    expect(correctQuery('окрашевание', VOCABULARY)).toBe('окрашивание')
    expect(correctQuery('ламинерование', VOCABULARY)).toBe('ламинирование')
  })

  it('a word whose stem already matches is found without a correction', () => {
    expect(correctQuery('маникур', VOCABULARY)).toBeNull()
    expect(stemsOf('маникур')).toContain('маникюр')
  })

  it('leaves known words and their forms alone', () => {
    expect(correctQuery('стрижка', VOCABULARY)).toBeNull()
    expect(correctQuery('стрижку', VOCABULARY)).toBeNull()
  })

  it('does not invent a match for nonsense', () => {
    expect(correctQuery('йцукен', VOCABULARY)).toBeNull()
  })
})

describe('helpers', () => {
  it('counts an adjacent swap as one edit', () => {
    expect(editDistance('стиржка', 'стрижка')).toBe(1)
  })

  it('escapes LIKE wildcards', () => {
    expect(likePatterns(['50%_off'])).toEqual(['%50\\%\\_off%'])
  })

  it('normalizes punctuation away', () => {
    expect(normalize('Стрижка+борода!')).toBe('стрижка+борода')
  })
})
