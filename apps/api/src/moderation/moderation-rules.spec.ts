import { describe, expect, it } from 'vitest'
import { canApply, REPORTS_TO_HIDE, reporterKey, shouldAutoHide } from './moderation-rules.js'

describe('shouldAutoHide', () => {
  it('hides on the third reporter', () => {
    expect(REPORTS_TO_HIDE).toBe(3)
    expect(shouldAutoHide({ reporters: 2, isHidden: false, isKept: false })).toBe(false)
    expect(shouldAutoHide({ reporters: 3, isHidden: false, isKept: false })).toBe(true)
    expect(shouldAutoHide({ reporters: 7, isHidden: false, isKept: false })).toBe(true)
  })

  it('never hides what a moderator kept', () => {
    expect(shouldAutoHide({ reporters: 10, isHidden: false, isKept: true })).toBe(false)
  })

  it('does nothing for what is already hidden', () => {
    expect(shouldAutoHide({ reporters: 3, isHidden: true, isKept: false })).toBe(false)
  })
})

describe('reporterKey', () => {
  it('prefers the account to the device', () => {
    expect(reporterKey('42', 'abc')).toBe('c:42')
    expect(reporterKey(null, 'abc')).toBe('s:abc')
    expect(reporterKey(null, null)).toBeNull()
  })
})

describe('canApply', () => {
  it('blocks only people', () => {
    expect(canApply('profile', 'block')).toBe(true)
    expect(canApply('photo', 'block')).toBe(false)
    expect(canApply('review', 'block')).toBe(false)
    expect(canApply('review', 'keep')).toBe(true)
  })
})
