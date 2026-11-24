import { hashToken } from './hash.js'

describe('hashToken', () => {
  it('is the sha256 of the token in hex', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('differs per token', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'))
    expect(hashToken('a')).toHaveLength(64)
  })
})
