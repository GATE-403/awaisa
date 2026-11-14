import { Module } from '@nestjs/common'
import { ClientMessagesService } from './client-messages.service.js'
import { RemindersService } from './reminders.service.js'
import { ReturnVisitsService } from './return-visits.service.js'
import { SmsService } from './sms.service.js'
import { TelegramGatewayService } from './telegram-gateway.service.js'

@Module({
  providers: [
    SmsService,
    TelegramGatewayService,
    ClientMessagesService,
    RemindersService,
    ReturnVisitsService,
  ],
  exports: [SmsService, TelegramGatewayService, ClientMessagesService],
})
export class NotificationsModule {}
