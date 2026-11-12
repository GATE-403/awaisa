import { Module } from '@nestjs/common'
import { RemindersService } from './reminders.service.js'
import { ReturnVisitsService } from './return-visits.service.js'
import { SmsService } from './sms.service.js'
import { TelegramGatewayService } from './telegram-gateway.service.js'

@Module({
  providers: [SmsService, TelegramGatewayService, RemindersService, ReturnVisitsService],
  exports: [SmsService, TelegramGatewayService],
})
export class NotificationsModule {}
