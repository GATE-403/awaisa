import { SetMetadata } from '@nestjs/common'
import type { CacheTag } from './cache.service.js'

const CACHED = 'cache:cached'

type CachedOptions = { ttl: number; tags: CacheTag[]; maxAge?: number }

/** A public GET answer cached for `ttl` seconds under `tags` (key = the full URL). */
const Cached = (options: CachedOptions) => SetMetadata(CACHED, options)

export { CACHED, Cached }
export type { CachedOptions }
