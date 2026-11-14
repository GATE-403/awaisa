import { describe, expect, it } from 'vitest'
import { clientStartParam, readClientStartParam } from './client-telegram.js'

const SECRET = 'test-secret-test-secret-test-secret-00'
const ID = '3f2b8c1e-9a4d-4e7f-8b21-0c5d6e7f8a9b'

describe('client Telegram start parameter', () => {
  it('fits Telegram and reads back the booking id', () => {
    const param = clientStartParam(ID, SECRET)
    expect(param).toMatch(/^[A-Za-z0-9_-]{1,64}$/)
    expect(readClientStartParam(param, SECRET)).toBe(ID)
  })

  it('refuses a changed id, another secret and foreign codes', () => {
    const param = clientStartParam(ID, SECRET)
    const other = `${param.slice(0, 5)}${param[5] === 'a' ? 'b' : 'a'}${param.slice(6)}`
    expect(readClientStartParam(other, SECRET)).toBeNull()
    expect(readClientStartParam(param, `${SECRET}x`)).toBeNull()
    expect(readClientStartParam('abc123', SECRET)).toBeNull()
  })
})
