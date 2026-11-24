import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findUnmarkedText } from './unmarkedText'

const SRC = join(import.meta.dirname, '../../..')

// Files whose words are not interface text in the page's language: the fiscal receipt is a tax
// document, the global error page has no language to read (its own document), the kit demo is for
// developers, and the share images are drawn without one.
const NOT_TRANSLATED = [
  'shared/ui/ReceiptPaper/',
  'app/global-error.tsx',
  'app/[lang]/ui/',
  'opengraph-image.tsx',
  'app/apple-icon.tsx',
]

describe('interface text', () => {
  it('goes through Lingui everywhere, so /ru and /ky never show English', () => {
    const found = findUnmarkedText(SRC, (file) =>
      NOT_TRANSLATED.some((path) => file.includes(path)),
    )
    expect(found.map(({ file, line, text }) => `${file}:${line}  ${text}`)).toEqual([])
  })
})
