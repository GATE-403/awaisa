import { type DynamicModule, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AdminModule } from './admin/admin.module.js'
import { AuthModule } from './auth/auth.module.js'
import { BookingsModule } from './bookings/bookings.module.js'
import { BusinessesModule } from './businesses/businesses.module.js'
import { CacheModule } from './cache/cache.module.js'
import { RateLimitStorage } from './cache/rate-limit.storage.js'
import { CashDeskModule } from './cashdesk/cashdesk.module.js'
import { CatalogModule } from './catalog/catalog.module.js'
import { ClientsModule } from './clients/clients.module.js'
import { type Env, validateEnv } from './config/env.js'
import { CustomersModule } from './customers/customers.module.js'
import { DatabaseModule } from './database/database.module.js'
import { FiscalModule } from './fiscal/fiscal.module.js'
import { GeoModule } from './geo/geo.module.js'
import { HealthController } from './health/health.controller.js'
import { ImportModule } from './import/import.module.js'
import { InventoryModule } from './inventory/inventory.module.js'
import { LoyaltyModule } from './loyalty/loyalty.module.js'
import { MailingsModule } from './mailings/mailings.module.js'
import { MasterModule } from './master/master.module.js'
import { MediaModule } from './media/media.module.js'
import { PayrollModule } from './payroll/payroll.module.js'
import { ProfilesModule } from './profiles/profiles.module.js'
import { PromotionsModule } from './promotions/promotions.module.js'
import { PushModule } from './push/push.module.js'
import { QuestionsModule } from './questions/questions.module.js'
import { RankingsModule } from './rankings/rankings.module.js'
import { RecommendationsModule } from './recommendations/recommendations.module.js'
import { ReferralsModule } from './referrals/referrals.module.js'
import { ReviewsModule } from './reviews/reviews.module.js'
import { type ProcessRole, runsJobs } from './runtime/process-role.js'
import { RuntimeModule } from './runtime/runtime.module.js'
import { SearchModule } from './search/search.module.js'
import { TelegramModule } from './telegram/telegram.module.js'
import { TelemetryModule } from './telemetry/telemetry.module.js'
import { WaitlistModule } from './waitlist/waitlist.module.js'
import { WalletModule } from './wallet/wallet.module.js'

@Module({
  imports: [
    CacheModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, RateLimitStorage],
      useFactory: (config: ConfigService<Env, true>, storage: RateLimitStorage) => ({
        throttlers: [{ ttl: 60_000, limit: config.get('RATE_LIMIT_PER_MINUTE', { infer: true }) }],
        storage,
      }),
    }),
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
    QuestionsModule,
    SearchModule,
    GeoModule,
    WaitlistModule,
    PromotionsModule,
    LoyaltyModule,
    MailingsModule,
    InventoryModule,
    PayrollModule,
    CashDeskModule,
    FiscalModule,
    ImportModule,
    RecommendationsModule,
    TelemetryModule,
    ProfilesModule,
    RankingsModule,
    ReferralsModule,
    TelegramModule,
    PushModule,
    ClientsModule,
    MasterModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {
  // Without ScheduleModule the @Cron handlers are plain methods: an `api` process never runs them.
  static forRole(role: ProcessRole): DynamicModule {
    return {
      module: AppModule,
      imports: [RuntimeModule.forRole(role), ...(runsJobs(role) ? [ScheduleModule.forRoot()] : [])],
    }
  }
}
