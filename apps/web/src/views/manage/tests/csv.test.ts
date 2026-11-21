import { describe, expect, it } from 'vitest'
import { decodeCsv, findColumn, parseCsv } from '../lib/csv'

// «Имя;Телефон» in Windows-1251, as Excel in a Russian locale saves it.
const CP1251 = new Uint8Array([0xc8, 0xec, 0xff, 0x3b, 0xd2, 0xe5, 0xeb, 0xe5, 0xf4, 0xee, 0xed])

describe('decodeCsv', () => {
  it('reads UTF-8', () => {
    const buffer = new TextEncoder().encode('Имя;Телефон').buffer
    expect(decodeCsv(buffer)).toBe('Имя;Телефон')
  })

  it('falls back to Windows-1251 when the bytes are not UTF-8', () => {
    expect(decodeCsv(CP1251.buffer)).toBe('Имя;Телефон')
  })
})

describe('parseCsv', () => {
  it('takes «;», «,» or a tab, whichever the header uses most', () => {
    expect(parseCsv('Имя;Телефон\nАйгуль;0555123456')).toEqual([
      ['Имя', 'Телефон'],
      ['Айгуль', '0555123456'],
    ])
    expect(parseCsv('name,phone\nAigul,0555')).toEqual([
      ['name', 'phone'],
      ['Aigul', '0555'],
    ])
    expect(parseCsv('Имя\tТелефон\nАйгуль\t0555')[1]).toEqual(['Айгуль', '0555'])
  })

  it('keeps separators, line breaks and doubled quotes inside quoted cells', () => {
    const rows = parseCsv('Имя;Заметка\n"Иванова; Анна";"любит ""кофе""\nбез сахара"')
    expect(rows[1]).toEqual(['Иванова; Анна', 'любит "кофе"\nбез сахара'])
  })

  it('drops a BOM, Windows line ends, blank lines and cell padding', () => {
    expect(parseCsv('﻿Имя;Телефон\r\n\r\n Айгуль ; 0555 \r\n;\r\n')).toEqual([
      ['Имя', 'Телефон'],
      ['Айгуль', '0555'],
    ])
  })

  it('keeps the last row without a trailing line break', () => {
    expect(parseCsv('a;b\n1;2')).toHaveLength(2)
  })
})

describe('findColumn', () => {
  const headers = ['№', 'ФИО клиента', 'Телефон', 'Дата рождения', 'Ещё телефон']

  it('prefers an exact header, ignoring case and ё', () => {
    expect(findColumn(headers, ['телефон', 'phone'])).toBe(2)
    expect(findColumn(['Имя', 'Ещё'], ['еще'])).toBe(1)
  })

  it('falls back to a header that contains the name', () => {
    expect(findColumn(headers, ['фио', 'имя'])).toBe(1)
    expect(findColumn(headers, ['рождени'])).toBe(3)
  })

  it('says -1 when nothing fits', () => {
    expect(findColumn(headers, ['email'])).toBe(-1)
  })
})
