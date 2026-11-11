import { isSignedToken, SIGNED_TOKEN_PREFIX, visitLink, visitSignature } from './visit-link.js'

const SECRET = 'test-secret-test-secret-test-secret-1234'
const ID = '6f1c2d3e-0000-4000-8000-000000000001'

describe('visit links', () => {
  it('signs the booking id into a short link', () => {
    expect(visitLink('https://awaisa.kg', ID, SECRET)).toBe(
      `https://awaisa.kg/v/${ID}?s=${visitSignature(ID, SECRET)}`,
    )
  })

  it('accepts its own signature as a token and nothing else', () => {
    const token = `${SIGNED_TOKEN_PREFIX}${visitSignature(ID, SECRET)}`
    expect(isSignedToken(ID, token, SECRET)).toBe(true)
    expect(isSignedToken('6f1c2d3e-0000-4000-8000-000000000002', token, SECRET)).toBe(false)
    expect(isSignedToken(ID, 'sig.wrong', SECRET)).toBe(false)
    expect(isSignedToken(ID, visitSignature(ID, SECRET), SECRET)).toBe(false)
  })
})
