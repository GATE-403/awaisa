import { returnedRows, toNumber } from './sql.js'

describe('returnedRows', () => {
  it('unwraps the rows of UPDATE … RETURNING', () => {
    expect(returnedRows([[{ id: 'a' }, { id: 'b' }], 2])).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(returnedRows([[], 0])).toEqual([])
  })

  it('keeps plain rows as they are', () => {
    const rows = [{ id: 'a' }]
    expect(returnedRows(rows)).toBe(rows)
    expect(returnedRows([])).toEqual([])
  })
})

describe('toNumber', () => {
  it('reads numeric strings and numbers', () => {
    expect(toNumber('1500.50')).toBe(1500.5)
    expect(toNumber('42')).toBe(42)
    expect(toNumber(7)).toBe(7)
  })

  it('turns null and undefined into zero', () => {
    expect(toNumber(null)).toBe(0)
    expect(toNumber(undefined)).toBe(0)
  })
})
