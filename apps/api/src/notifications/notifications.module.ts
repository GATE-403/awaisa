import { Module } from '@nestjs/common'
import { ClientMessagesService } from './client-messages.service.js'
import { NotificationsController } from './notifications.controller.js'
import { RemindersService } from './reminders.service.js'
import { ReturnVisitsService } from './return-visits.service.js'
import { SmsService } from './sms.service.js'
import { TelegramGatewayService } from './telegram-gateway.service.js'
import { WhatsappService } from './whatsapp.service.js'
import { WhatsappWebhookController } from './whatsapp-webhook.controller.js'

@Module({
  controllers: [NotificationsController, WhatsappWebhookController],
  providers: [
    SmsService,
    WhatsappService,
    TelegramGatewayService,
    ClientMessagesService,
    RemindersService,
    ReturnVisitsService,
  ],
  exports: [SmsService, TelegramGatewayService, ClientMessagesService],
})
export class NotificationsModule {}
