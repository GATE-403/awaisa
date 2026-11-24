import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSlugProblem, RESERVED_SLUGS } from './business-rules.js'

const WEB_SRC = join(dirname(fileURLToPath(import.meta.url)), '../../../web/src')

// The web's own first path segments, read from its source: a business taking one would be hidden
// behind an app page (AGENTS.md: keep APP_SEGMENTS and RESERVED_SLUGS in sync).
const readAppSegments = () => {
  const source = readFileSync(join(WEB_SRC, 'shared/config/navigation.ts'), 'utf8')
  const block = source.match(/APP_SEGMENTS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? ''
  // Comments may hold apostrophes («Clients' public profiles»): drop them before reading quotes.
  const code = block.replace(/\/\/.*$/gm, '')
  return [...code.matchAll(/'([^']+)'/g)].map((match) => match[1] as string)
}

const readRouteFolders = () =>
  readdirSync(join(WEB_SRC, 'app/[lang]'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[a-z]/.test(entry.name))
    .map((entry) => entry.name)

describe('getSlugProblem', () => {
  it('accepts latin letters, digits and single hyphens, 3 to 48 characters', () => {
    expect(getSlugProblem('old-school')).toBeNull()
    expect(getSlugProblem('abc')).toBeNull()
    expect(getSlugProblem('a'.repeat(48))).toBeNull()
    expect(getSlugProblem('studio-24')).toBeNull()
  })

  it('refuses what cannot be a clean address', () => {
    for (const slug of [
      'ab',
      'a'.repeat(49),
      '-studio',
      'studio-',
      'old--school',
      'Студия',
      'Old',
      'a b',
      'a.b',
    ]) {
      expect(getSlugProblem(slug), slug).toBe(
        'Address: Latin letters, digits and hyphens, 3 to 48 characters',
      )
    }
  })

  it('refuses the app’s own words', () => {
    expect(getSlugProblem('manage')).toBe('This address is taken')
    expect(getSlugProblem('insights')).toBe('This address is taken')
  })
})

describe('RESERVED_SLUGS', () => {
  it('holds every first path segment the web app uses that could be a slug', () => {
    const segments = readAppSegments()
    expect(segments.length).toBeGreaterThan(10)
    // Shorter segments («u», «v», «ui») can never be slugs: the pattern needs three characters.
    const missing = segments.filter(
      (segment) => !getSlugProblem(segment) && !RESERVED_SLUGS.has(segment),
    )
    expect(missing).toEqual([])
  })

  it('holds every top-level route folder of the web app', () => {
    const folders = readRouteFolders()
    expect(folders).toContain('manage')
    const missing = folders.filter(
      (folder) => !getSlugProblem(folder) && !RESERVED_SLUGS.has(folder),
    )
    expect(missing).toEqual([])
  })
})
