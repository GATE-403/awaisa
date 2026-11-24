import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parseRegion } from './index.js'

const INSTALLATION_FILE = 'region.json'
const EXAMPLE_FILE = 'region.example.json'

/** @param {string} from @param {string} name */
const findUp = (from, name) => {
  let dir = resolve(from)
  for (;;) {
    const candidate = join(dir, name)
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/** @param {string} file */
const readRegion = (file) => {
  try {
    return parseRegion(JSON.parse(readFileSync(file, 'utf8')))
  } catch (error) {
    throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/** @param {{ file?: string | null, from: string, allowExample: boolean }} options */
const loadRegionFile = ({ file, from, allowExample }) => {
  if (file) {
    const path = resolve(from, file)
    if (!existsSync(path)) throw new Error(`REGION_FILE ${path} does not exist`)
    return { region: readRegion(path), file: path, isExample: false }
  }
  const installation = findUp(from, INSTALLATION_FILE)
  if (installation) {
    return { region: readRegion(installation), file: installation, isExample: false }
  }
  const example = allowExample ? findUp(from, EXAMPLE_FILE) : null
  if (example) return { region: readRegion(example), file: example, isExample: true }
  throw new Error(
    `No ${INSTALLATION_FILE}: describe your country and city in it (copy ${EXAMPLE_FILE}, see docs/installation-region.md) or set REGION_FILE`,
  )
}

export { loadRegionFile }
