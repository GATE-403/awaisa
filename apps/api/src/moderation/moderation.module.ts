import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { MediaModule } from '../media/media.module.js'
import { TelegramModule } from '../telegram/telegram.module.js'
import { ModerationController } from './moderation.controller.js'
import { ModerationService } from './moderation.service.js'

@Module({
  imports: [AuthModule, MediaModule, TelegramModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
