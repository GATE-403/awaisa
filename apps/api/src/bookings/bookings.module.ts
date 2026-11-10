import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TimeOff } from '../admin/time-off.entity.js'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { CatalogModule } from '../catalog/catalog.module.js'
import { Customer } from '../customers/customer.entity.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { TelegramModule } from '../telegram/telegram.module.js'
import { Booking } from './booking.entity.js'
import { BookingsController } from './bookings.controller.js'
import { BookingsService } from './bookings.service.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, TimeOff, Customer]),
    CatalogModule,
    AuthModule,
    BusinessesModule,
    NotificationsModule,
    TelegramModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
