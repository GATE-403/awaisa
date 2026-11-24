import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BookingsModule } from '../bookings/bookings.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { TelegramModule } from '../telegram/telegram.module.js'
import { BillingController } from './billing.controller.js'
import { BillingOrdersService } from './billing-orders.service.js'

// Paying for plans: the «Plan» endpoints, plan orders through `payments`, end reminders.
@Module({
  imports: [AuthModule, BusinessesModule, BookingsModule, NotificationsModule, TelegramModule],
  controllers: [BillingController],
  providers: [BillingOrdersService],
})
export class BillingModule {}
