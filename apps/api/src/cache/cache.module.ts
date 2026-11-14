import { Global, Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { CacheInterceptor } from './cache.interceptor.js'
import { CacheService } from './cache.service.js'
import { RateLimitStorage } from './rate-limit.storage.js'

@Global()
@Module({
  providers: [
    CacheService,
    RateLimitStorage,
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
  exports: [CacheService, RateLimitStorage],
})
export class CacheModule {}
