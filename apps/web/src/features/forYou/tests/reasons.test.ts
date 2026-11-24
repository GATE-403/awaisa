import { setupI18n } from '@lingui/core'
import { describe, expect, it } from 'vitest'
import { shortReason as shortReasonIn, storyNote as storyNoteIn } from '../lib/reasons'

const i18n = setupI18n({ locale: 'en', messages: { en: {} } })
const t = i18n._.bind(i18n)
const shortReason = (reason: string) => shortReasonIn(reason, t)
const storyNote = (reason: string) => storyNoteIn(reason, t)

describe('shortReason', () => {
  it('keeps reasons that fit the card capsule', () => {
    for (const reason of [
      'Due again · 5 wk',
      'Nearby · 1.2 km',
      'Nearby · 850 m',
      'Today from 15:00',
      'Rating 4.7',
      'Popular',
      'Your usual',
      'New place',
    ]) {
      expect(shortReason(reason)).toBe(reason)
    }
  })

  it('cuts long reasons to their lead or a short form', () => {
    expect(shortReason('Your pick · haircuts')).toBe('Your pick')
    expect(shortReason('Often booked with beard trim')).toBe('Often paired')
    expect(shortReason('Tomorrow from 15:00')).toBe('Tomorrow 15:00')
  })
})

describe('storyNote', () => {
  it('says each reason in a word or two under a story tile', () => {
    expect(storyNote('Due again · 5 wk')).toBe('Due again')
    expect(storyNote('Nearby · 1.2 km')).toBe('Nearby')
    expect(storyNote('Today from 15:00')).toBe('Today 15:00')
    expect(storyNote('Tomorrow from 9:30')).toBe('Tomorrow 9:30')
    expect(storyNote('Rating 4.7')).toBe('★ 4.7')
    expect(storyNote('Often booked with manicure')).toBe('Often paired')
    expect(storyNote('Your pick · nails')).toBe('Your pick')
    expect(storyNote('Your usual')).toBe('Your usual')
    expect(storyNote('Been here')).toBe('Been here')
    expect(storyNote('Similar')).toBe('Similar')
  })
})
