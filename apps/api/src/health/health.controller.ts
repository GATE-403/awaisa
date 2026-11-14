import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { DataSource } from 'typeorm'
import { CacheService } from '../cache/cache.service.js'

type HealthStatus = {
  status: 'ok'
  database: 'up'
  /** Informational: without Redis the API still answers, on per-process memory. */
  cache: 'redis' | 'memory'
}

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  // 503 only when the database is down: that is when the API cannot serve anything.
  @Get()
  async check(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1')
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' })
    }
    const redis = this.cache.redisClient
    const hasRedis = redis
      ? await redis.ping().then(
          () => true,
          () => false,
        )
      : false

    return { status: 'ok', database: 'up', cache: hasRedis ? 'redis' : 'memory' }
  }
}
