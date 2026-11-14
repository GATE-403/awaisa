import { Injectable, Logger } from '@nestjs/common'
import { type ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler'
import { CacheService } from './cache.service.js'

// A fixed window per key: the first hit starts it, every hit counts, and going over the limit
// sets a block key that outlives the window when blockDuration says so. One round trip, atomic.
const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
local blocked = redis.call('PTTL', KEYS[2])
if blocked <= 0 and hits > tonumber(ARGV[2]) and tonumber(ARGV[3]) > 0 then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  blocked = tonumber(ARGV[3])
end
return { hits, ttl, blocked }
`

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>

const toSeconds = (ms: number) => (ms > 0 ? Math.ceil(ms / 1000) : 0)

/**
 * Rate-limit counters in Redis, so «5 bookings a minute» means five across every API instance
 * and survives a deploy. Without Redis, or when it fails, the in-process counters take over:
 * a limit is never a reason to fail a request.
 */
@Injectable()
export class RateLimitStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RateLimitStorage.name)
  private readonly memory = new ThrottlerStorageService()
  private lastWarnedAt = 0

  constructor(private readonly cache: CacheService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redis = this.cache.redisClient
    if (!redis) return this.memory.increment(key, ttl, limit, blockDuration, throttlerName)
    try {
      const id = `rl:${throttlerName}:${key}`
      const [hits, windowMs, blockMs] = (await redis.eval(INCREMENT_SCRIPT, {
        keys: [id, `${id}:block`],
        arguments: [String(ttl), String(limit), String(blockDuration)],
      })) as [number, number, number]

      return {
        totalHits: hits,
        timeToExpire: toSeconds(windowMs),
        isBlocked: blockMs > 0,
        timeToBlockExpire: toSeconds(blockMs),
      }
    } catch (error) {
      if (Date.now() - this.lastWarnedAt > 60_000) {
        this.lastWarnedAt = Date.now()
        this.logger.warn(`Rate limits on memory: ${(error as Error).message}`)
      }
      return this.memory.increment(key, ttl, limit, blockDuration, throttlerName)
    }
  }
}
