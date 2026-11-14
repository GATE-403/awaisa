import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(import.meta.dirname, '..')

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(join(dir, entry.name))
      : entry.name.endsWith('.ts')
        ? [join(dir, entry.name)]
        : [],
  )

// @awaisa/contracts ships TypeScript source only. A value import would survive the build and
// make Node load a .ts file from node_modules at start-up, which it refuses.
describe('@awaisa/contracts in the API', () => {
  it('is only ever imported as types', () => {
    const offenders = sourceFiles(SRC).filter((file) =>
      // One statement at a time: the specifier list cannot run past another import's quotes.
      /^import\s+(?!type\b)[^'"]*?from\s+'@awaisa\/contracts'/m.test(readFileSync(file, 'utf8')),
    )

    expect(offenders).toEqual([])
  })
})
