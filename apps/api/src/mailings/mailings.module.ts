import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { MailingsController } from './mailings.controller.js'
import { MailingsService } from './mailings.service.js'

@Module({
  imports: [AuthModule, BusinessesModule, NotificationsModule],
  controllers: [MailingsController],
  providers: [MailingsService],
})
export class MailingsModule {}
