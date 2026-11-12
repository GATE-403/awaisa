import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AdminModule } from './admin/admin.module.js'
import { AuthModule } from './auth/auth.module.js'
import { BookingsModule } from './bookings/bookings.module.js'
import { BusinessesModule } from './businesses/businesses.module.js'
import { CatalogModule } from './catalog/catalog.module.js'
import { ClientsModule } from './clients/clients.module.js'
import { type Env, validateEnv } from './config/env.js'
import { CustomersModule } from './customers/customers.module.js'
import { DatabaseModule } from './database/database.module.js'
import { HealthController } from './health/health.controller.js'
import { MasterModule } from './master/master.module.js'
import { MediaModule } from './media/media.module.js'
import { PromotionsModule } from './promotions/promotions.module.js'
import { ReviewsModule } from './reviews/reviews.module.js'
import { TelegramModule } from './telegram/telegram.module.js'
import { WaitlistModule } from './waitlist/waitlist.module.js'
import { WalletModule } from './wallet/wallet.module.js'

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
    ScheduleModule.forRoot(),
    DatabaseModule,
    CatalogModule,
    BusinessesModule,
    BookingsModule,
    AuthModule,
    CustomersModule,
    AdminModule,
    MediaModule,
    WalletModule,
    ReviewsModule,
    WaitlistModule,
    PromotionsModule,
    TelegramModule,
    ClientsModule,
    MasterModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
