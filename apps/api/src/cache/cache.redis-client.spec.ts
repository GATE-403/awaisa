import { afterEach, describe, expect, it, vi } from 'vitest'

const createClient = vi.fn()

vi.mock('redis', () => ({ createClient }))

describe('CacheService Redis client', () => {
  afterEach(() => {
    delete process.env.REDIS_URL
    createClient.mockReset()
  })

  // Regression: with the default offline queue, a Redis outage made every cached read and
  // rate-limit check wait for the reconnect, and the whole API stopped answering.
  it('fails commands at once while Redis is away and gives up on a stalled one', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    createClient.mockReturnValue({ on: vi.fn(), connect: vi.fn().mockResolvedValue(undefined) })
    const { CacheService } = await import('./cache.service.js')

    await new CacheService().onModuleInit()

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        disableOfflineQueue: true,
        commandOptions: { timeout: expect.any(Number) },
      }),
    )
  })
})
