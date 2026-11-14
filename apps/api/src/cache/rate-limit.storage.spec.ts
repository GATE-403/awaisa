import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from './cache.service.js'
import { RateLimitStorage } from './rate-limit.storage.js'

const storageWith = (redisClient: unknown) =>
  new RateLimitStorage({ redisClient } as unknown as CacheService)

describe('RateLimitStorage', () => {
  it('reads the counters Redis keeps for every instance', async () => {
    const evalScript = vi.fn().mockResolvedValue([6, 42_100, 0])
    const record = await storageWith({ eval: evalScript }).increment(
      'k',
      60_000,
      5,
      60_000,
      'default',
    )

    expect(record).toEqual({
      totalHits: 6,
      timeToExpire: 43,
      isBlocked: false,
      timeToBlockExpire: 0,
    })
    expect(evalScript.mock.calls[0]?.[1]).toEqual({
      keys: ['rl:default:k', 'rl:default:k:block'],
      arguments: ['60000', '5', '60000'],
    })
  })

  it('reports a block with its time left', async () => {
    const storage = storageWith({ eval: vi.fn().mockResolvedValue([7, 30_000, 59_500]) })

    expect(await storage.increment('k', 60_000, 5, 60_000, 'default')).toMatchObject({
      isBlocked: true,
      timeToBlockExpire: 60,
    })
  })

  it('counts in memory without Redis or when Redis fails, never failing the request', async () => {
    for (const storage of [
      storageWith(null),
      storageWith({ eval: vi.fn().mockRejectedValue(new Error('down')) }),
    ]) {
      const hits = []
      for (let i = 0; i < 3; i++) {
        hits.push((await storage.increment('k', 60_000, 2, 60_000, 'default')).totalHits)
      }
      expect(hits).toEqual([1, 2, 3])
      expect((await storage.increment('k', 60_000, 2, 60_000, 'default')).isBlocked).toBe(true)
    }
  })
})
