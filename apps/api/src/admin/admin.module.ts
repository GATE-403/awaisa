import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { BookingsModule } from '../bookings/bookings.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { CatalogModule } from '../catalog/catalog.module.js'
import { InventoryModule } from '../inventory/inventory.module.js'
import { LoyaltyModule } from '../loyalty/loyalty.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { AdminController } from './admin.controller.js'
import { AdminService } from './admin.service.js'
import { AnalyticsService } from './analytics.service.js'
import { TimeOff } from './time-off.entity.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeOff]),
    AuthModule,
    BookingsModule,
    BusinessesModule,
    CatalogModule,
    NotificationsModule,
    LoyaltyModule,
    InventoryModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AnalyticsService],
})
export class AdminModule {}
