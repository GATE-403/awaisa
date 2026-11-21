import type { ClientMessagingConfig } from '@awaisa/contracts'
import { Controller, Get } from '@nestjs/common'
import { WhatsappService } from './whatsapp.service.js'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Get('config')
  getConfig(): ClientMessagingConfig {
    return { isWhatsappOn: this.whatsapp.isEnabled() }
  }
}
