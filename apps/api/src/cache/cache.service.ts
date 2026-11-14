import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { createClient } from 'redis'

type CacheTag = 'catalog' | 'availability'

type Entry = { value: string; expiresAt: number }

type RedisClient = ReturnType<typeof createClient>

const MEMORY_LIMIT = 2000
const COMMAND_TIMEOUT_MS = 1000

// Read-through cache for public answers. With REDIS_URL it lives in Redis (shared by every API
// instance); without it, in this process's memory. Invalidation is by tag versions: a key
// carries the versions of its tags, and bumping a tag makes every older key unreachable at once
// (old entries simply expire). Any cache failure falls back to the database — never an error.
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name)
  private redis: RedisClient | null = null
  private readonly memory = new Map<string, Entry>()
  private readonly versions = new Map<string, number>()

  async onModuleInit() {
    const url = process.env.REDIS_URL
    // Connected even with API_CACHE=off: the rate limits keep their counters here too.
    if (!url) return
    const client = createClient({
      url,
      socket: { reconnectStrategy: (tries) => Math.min(tries * 200, 5000) },
      // While Redis is away, commands fail at once instead of queueing until it is back: by
      // default every cached read and rate-limit check waited, which hung the whole API.
      disableOfflineQueue: true,
      // Connected but not answering (overloaded, a network stall): give up after a second.
      commandOptions: { timeout: COMMAND_TIMEOUT_MS },
    })
    client.on('error', (error: Error) => this.logger.warn(`Redis: ${error.message}`))
    // Starting never waits on Redis for long: no answer in 3 s and the memory cache takes over.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('no answer in 3 s')), 3000),
    )
    try {
      await Promise.race([client.connect(), timeout])
      this.redis = client
      this.logger.log('Cache: Redis')
    } catch (error) {
      this.logger.warn(`Cache: Redis unavailable, using memory (${(error as Error).message})`)
      await client.destroy?.()
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined)
  }

  /** The shared Redis connection, or null when this process runs on memory alone. */
  get redisClient(): RedisClient | null {
    return this.redis
  }

  get isEnabled() {
    return process.env.API_CACHE !== 'off'
  }

  /** The cached JSON for `key`, or computes, stores it for `ttlSeconds` and returns it. */
  async remember<T>(key: string, ttlSeconds: number, tags: CacheTag[], compute: () => Promise<T>) {
    if (!this.isEnabled) return compute()
    const versioned = `${await this.versionPrefix(tags)}:${key}`
    const hit = await this.read(versioned)
    if (hit !== null) return JSON.parse(hit) as T
    const value = await compute()
    await this.write(versioned, JSON.stringify(value), ttlSeconds)
    return value
  }

  /** Everything cached under these tags is stale from now on. */
  async bump(tags: CacheTag[]) {
    for (const tag of tags) {
      this.versions.set(tag, (this.versions.get(tag) ?? 0) + 1)
      await this.redis?.incr(`cache:v:${tag}`).catch(() => undefined)
    }
  }

  private async versionPrefix(tags: CacheTag[]) {
    if (!this.redis) return tags.map((tag) => `${tag}${this.versions.get(tag) ?? 0}`).join('.')
    try {
      const values = await this.redis.mGet(tags.map((tag) => `cache:v:${tag}`))
      return tags.map((tag, index) => `${tag}${values[index] ?? 0}`).join('.')
    } catch {
      return tags.map((tag) => `${tag}${this.versions.get(tag) ?? 0}`).join('.')
    }
  }

  private async read(key: string) {
    if (this.redis) {
      try {
        return await this.redis.get(`cache:${key}`)
      } catch {
        return null
      }
    }
    const entry = this.memory.get(key)
    if (!entry) return null
    if (entry.expiresAt < Date.now()) {
      this.memory.delete(key)
      return null
    }
    return entry.value
  }

  private async write(key: string, value: string, ttlSeconds: number) {
    if (this.redis) {
      await this.redis.set(`cache:${key}`, value, { EX: ttlSeconds }).catch(() => undefined)
      return
    }
    // A small memory cache: the oldest entries go first when it is full.
    if (this.memory.size >= MEMORY_LIMIT) {
      const oldest = this.memory.keys().next().value
      if (oldest !== undefined) this.memory.delete(oldest)
    }
    this.memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  }
}

export type { CacheTag, RedisClient }
