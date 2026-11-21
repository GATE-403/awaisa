import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BookingsModule } from '../bookings/bookings.module.js'
import { LoyaltyModule } from '../loyalty/loyalty.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { TelegramModule } from '../telegram/telegram.module.js'
import { CertificateSalesService } from './certificate-sales.service.js'
import { CertificatesController } from './certificates.controller.js'

@Module({
  imports: [AuthModule, BookingsModule, LoyaltyModule, NotificationsModule, TelegramModule],
  controllers: [CertificatesController],
  providers: [CertificateSalesService],
})
export class CertificatesModule {}
