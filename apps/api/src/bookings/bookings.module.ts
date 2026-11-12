import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TimeOff } from '../admin/time-off.entity.js'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { CatalogModule } from '../catalog/catalog.module.js'
import { Customer } from '../customers/customer.entity.js'
import { InventoryModule } from '../inventory/inventory.module.js'
import { LoyaltyModule } from '../loyalty/loyalty.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { PromotionsModule } from '../promotions/promotions.module.js'
import { TelegramModule } from '../telegram/telegram.module.js'
import { Booking } from './booking.entity.js'
import { BookingsController } from './bookings.controller.js'
import { BookingsService } from './bookings.service.js'
import { Payment } from './payment.entity.js'
import { PaymentsController } from './payments.controller.js'
import { PaymentsService } from './payments.service.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, TimeOff, Customer, Payment]),
    CatalogModule,
    AuthModule,
    BusinessesModule,
    NotificationsModule,
    PromotionsModule,
    LoyaltyModule,
    InventoryModule,
    TelegramModule,
  ],
  controllers: [BookingsController, PaymentsController],
  providers: [BookingsService, PaymentsService],
  exports: [BookingsService, PaymentsService],
})
export class BookingsModule {}
