import { describe, expect, it } from 'vitest'
import { isLoginToken, loginStartParam, readLoginStartParam } from './telegram-login.js'

const TOKEN = 'Abc_def-0123456789abcdefghijklmnopqrstuv'

describe('telegram login start parameter', () => {
  it('round-trips a token through the bot link', () => {
    expect(readLoginStartParam(loginStartParam(TOKEN))).toBe(TOKEN)
    expect(loginStartParam(TOKEN).length).toBeLessThanOrEqual(64)
  })

  it('ignores the owners’ codes and the clients’ booking links', () => {
    expect(readLoginStartParam('v0123abcd')).toBeNull()
    expect(readLoginStartParam('a1B2c3D4e5F6g7H8')).toBeNull()
  })

  it('refuses short, long and odd tokens', () => {
    expect(isLoginToken('short')).toBe(false)
    expect(isLoginToken('a'.repeat(59))).toBe(false)
    expect(isLoginToken(`${'a'.repeat(40)}!`)).toBe(false)
    expect(readLoginStartParam('login_')).toBeNull()
  })
})
