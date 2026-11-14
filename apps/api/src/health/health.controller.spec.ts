import { ServiceUnavailableException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { CacheService } from '../cache/cache.service.js'
import { HealthController } from './health.controller.js'

const setup = async (query: () => Promise<unknown>, redisClient: unknown = null) => {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      { provide: DataSource, useValue: { query: vi.fn(query) } },
      { provide: CacheService, useValue: { redisClient } },
    ],
  }).compile()

  return moduleRef.get(HealthController)
}

describe('HealthController', () => {
  it('reports ok when the database responds', async () => {
    const controller = await setup(async () => [{ '?column?': 1 }])

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
      cache: 'memory',
    })
  })

  it('says whether Redis answers, without failing when it does not', async () => {
    const answering = await setup(async () => [], { ping: vi.fn().mockResolvedValue('PONG') })
    const silent = await setup(async () => [], {
      ping: vi.fn().mockRejectedValue(new Error('down')),
    })

    await expect(answering.check()).resolves.toMatchObject({ status: 'ok', cache: 'redis' })
    await expect(silent.check()).resolves.toMatchObject({ status: 'ok', cache: 'memory' })
  })

  it('returns 503 when the database is unreachable', async () => {
    const controller = await setup(async () => {
      throw new Error('connection refused')
    })

    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
