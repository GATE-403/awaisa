import { Module } from '@nestjs/common'
import { RemindersService } from './reminders.service.js'
import { SmsService } from './sms.service.js'
import { TelegramGatewayService } from './telegram-gateway.service.js'

@Module({
  providers: [SmsService, TelegramGatewayService, RemindersService],
  exports: [SmsService, TelegramGatewayService],
})
export class NotificationsModule {}
