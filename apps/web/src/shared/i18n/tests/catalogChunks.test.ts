import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCALES } from '../locales'

const SRC = join(import.meta.dirname, '../../..')
const APP = join(SRC, 'app')

const filesUnder = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })

// A catalog handed to a client component as a prop is serialized into every page's HTML and RSC
// payload; the browser should load it once, as its language's own chunk.
describe('catalogs reach the browser as chunks', () => {
  it('the client provider imports each language on its own', () => {
    const provider = readFileSync(join(SRC, 'shared/i18n/LinguiClientProvider.tsx'), 'utf8')
    for (const locale of LOCALES) {
      expect(provider).toContain(`import('@/locales/${locale}/messages')`)
    }
    expect(provider).not.toMatch(/^import .*@\/locales\//m)
  })

  it('no layout or page passes compiled messages to the client', () => {
    const offenders = filesUnder(APP)
      .filter((path) => /\/(layout|page|template)\.tsx$/.test(path))
      .filter((path) => /messages=\{|CATALOGS/.test(readFileSync(path, 'utf8')))
    expect(offenders).toEqual([])
  })
})
