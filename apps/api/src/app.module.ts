import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { BookingsModule } from './bookings/bookings.module.js'
import { CatalogModule } from './catalog/catalog.module.js'
import { type Env, validateEnv } from './config/env.js'
import { DatabaseModule } from './database/database.module.js'
import { HealthController } from './health/health.controller.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        { ttl: 60_000, limit: config.get('RATE_LIMIT_PER_MINUTE', { infer: true }) },
      ],
    }),
    DatabaseModule,
    CatalogModule,
    BookingsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
