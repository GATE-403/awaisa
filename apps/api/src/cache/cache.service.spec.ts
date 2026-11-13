import { afterEach, describe, expect, it, vi } from 'vitest'
import { CacheService } from './cache.service.js'

describe('CacheService (memory)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('computes once and serves the stored answer until it expires', async () => {
    vi.useFakeTimers()
    const cache = new CacheService()
    const compute = vi.fn(async () => ({ value: 1 }))
    expect(await cache.remember('a', 10, ['catalog'], compute)).toEqual({ value: 1 })
    expect(await cache.remember('a', 10, ['catalog'], compute)).toEqual({ value: 1 })
    expect(compute).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(11_000)
    await cache.remember('a', 10, ['catalog'], compute)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('a bumped tag makes its entries stale, other tags stay', async () => {
    const cache = new CacheService()
    const catalog = vi.fn(async () => 'catalog')
    const slots = vi.fn(async () => 'slots')
    await cache.remember('c', 60, ['catalog'], catalog)
    await cache.remember('s', 60, ['availability'], slots)
    await cache.bump(['availability'])
    await cache.remember('c', 60, ['catalog'], catalog)
    await cache.remember('s', 60, ['availability'], slots)
    expect(catalog).toHaveBeenCalledTimes(1)
    expect(slots).toHaveBeenCalledTimes(2)
  })

  it('errors are not cached', async () => {
    const cache = new CacheService()
    const failing = vi.fn(async () => {
      throw new Error('boom')
    })
    await expect(cache.remember('e', 60, ['catalog'], failing)).rejects.toThrow('boom')
    await expect(cache.remember('e', 60, ['catalog'], failing)).rejects.toThrow('boom')
    expect(failing).toHaveBeenCalledTimes(2)
  })
})
