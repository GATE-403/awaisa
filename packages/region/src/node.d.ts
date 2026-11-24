import type { Region } from './index.js'

type LoadedRegion = {
  region: Region
  /** The file it came from. */
  file: string
  /** True when it is `region.example.json`: no installation file was found. */
  isExample: boolean
}

/**
 * The installation's region: `file` when given (`REGION_FILE`), else the nearest `region.json`
 * above `from`, else, when `allowExample`, the nearest `region.example.json`. Throws a message
 * that says what to create when there is none.
 */
declare const loadRegionFile: (options: {
  file?: string | null
  from: string
  allowExample: boolean
}) => LoadedRegion

export type { LoadedRegion }
export { loadRegionFile }
