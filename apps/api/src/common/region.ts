import type { Region } from '@awaisa/region'
import { loadRegionFile } from '@awaisa/region/node'

let current: Region | null = null

/**
 * The installation's country and city, from its `region.json` (or `REGION_FILE`): the code knows
 * no country of its own (docs/installation-region.md). Outside production, without one, the
 * repository's `region.example.json` serves development and tests; production refuses to start.
 * Read on first use, not at import: `main.ts` loads the root .env after the imports have run.
 */
const currentRegion = (): Region => {
  current ??= loadRegionFile({
    file: process.env.REGION_FILE,
    from: process.cwd(),
    allowExample: process.env.NODE_ENV !== 'production',
  }).region
  return current
}

export { currentRegion }
