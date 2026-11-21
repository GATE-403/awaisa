import { describe, expect, it } from 'vitest'
import { open, seal } from './secret-box.js'

const SECRET = 'a-secret-of-at-least-thirty-two-characters'

describe('secret box', () => {
  it('opens what it sealed and never stores the plain text', () => {
    const sealed = seal('пароль 123', SECRET)
    expect(sealed).not.toContain('123')
    expect(open(sealed, SECRET)).toBe('пароль 123')
  })

  it('seals the same text differently each time', () => {
    expect(seal('x', SECRET)).not.toBe(seal('x', SECRET))
  })

  it('refuses another secret or a changed box', () => {
    const sealed = seal('пароль', SECRET)
    expect(open(sealed, `${SECRET}!`)).toBeNull()
    expect(open(`${sealed.slice(0, -2)}AA`, SECRET)).toBeNull()
    expect(open('garbage', SECRET)).toBeNull()
  })
})
