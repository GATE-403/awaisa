import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCALES } from '../locales'

// pofile-ts comes with @lingui/format-po (what `lingui extract` writes the catalogs with).
const require = createRequire(import.meta.resolve('@lingui/format-po'))
const { parsePo } = require('pofile-ts') as {
  parsePo: (text: string) => {
    items: { msgid: string; msgctxt?: string; msgstr: string[]; obsolete: boolean }[]
  }
}

// A message is its text and its context: «Book» for the client and «Book» for the staff are two.
const keyOf = (item: { msgid: string; msgctxt?: string }) =>
  item.msgctxt ? `${item.msgid} [${item.msgctxt}]` : item.msgid

const CATALOGS = join(import.meta.dirname, '../../../locales')

const readCatalog = (locale: string) =>
  parsePo(readFileSync(join(CATALOGS, locale, 'messages.po'), 'utf8')).items.filter(
    (item) => !item.obsolete,
  )

// The value names a message fills in: `{name}` and the argument of `{count, plural, …}`; the
// words inside a plural's branches are not placeholders.
const placeholders = (message: string) => {
  const names = new Set<string>()
  let depth = 0
  for (const match of message.matchAll(/\{(\w+)(?:,\s*\w+)?|\{|\}/g)) {
    if (match[0] === '}') depth = Math.max(0, depth - 1)
    else {
      if (match[1] && depth % 2 === 0) names.add(match[1])
      depth++
    }
  }
  return [...names].sort()
}

describe('translation catalogs', () => {
  const source = readCatalog('en')

  it.each(LOCALES.filter((locale) => locale !== 'en'))('%s translates every message', (locale) => {
    const untranslated = readCatalog(locale)
      .filter((item) => !item.msgstr.some((text) => text.trim()))
      .map(keyOf)
    expect(untranslated).toEqual([])
  })

  it.each(LOCALES.filter((locale) => locale !== 'en'))('%s keeps every placeholder', (locale) => {
    const lost = readCatalog(locale)
      .filter((item) => item.msgstr[0])
      .filter(
        (item) => placeholders(item.msgid).join() !== placeholders(item.msgstr[0] ?? '').join(),
      )
      .map((item) => `${item.msgid} → ${item.msgstr[0]}`)
    expect(lost).toEqual([])
  })

  it('has the same messages in every language', () => {
    const ids = source.map(keyOf).sort()
    for (const locale of LOCALES) {
      expect(readCatalog(locale).map(keyOf).sort()).toEqual(ids)
    }
  })
})
