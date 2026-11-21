import { describe, expect, it } from 'vitest'
import { AREAS, COUNTED, DICTIONARY } from '../dictionary'

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

describe('DICTIONARY', () => {
  it('has a Kyrgyz and an English text for every string', () => {
    for (const [russian, [ky, en]] of Object.entries(DICTIONARY)) {
      expect(ky.trim(), `ky for «${russian}»`).not.toBe('')
      expect(en.trim(), `en for «${russian}»`).not.toBe('')
    }
  })

  it('keeps the placeholders of the Russian text', () => {
    for (const [russian, translations] of Object.entries(DICTIONARY)) {
      for (const text of translations) {
        expect(placeholders(text), `«${text}» for «${russian}»`).toEqual(placeholders(russian))
      }
    }
  })

  it('translates a string the same way in every area', () => {
    const seen = new Map<string, [string, string]>()
    for (const area of Object.values(AREAS)) {
      for (const [russian, entry] of Object.entries(area)) {
        const earlier = seen.get(russian)
        if (earlier) expect(entry, `«${russian}»`).toEqual(earlier)
        seen.set(russian, entry)
      }
    }
  })

  it('has every counted word in both languages', () => {
    for (const [russian, forms] of Object.entries(COUNTED)) {
      for (const form of forms) expect(form.trim(), `«${russian}»`).not.toBe('')
    }
  })
})
