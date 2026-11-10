import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { TelegramController } from './telegram.controller.js'
import { TelegramBotService } from './telegram-bot.service.js'
import { TelegramChat } from './telegram-chat.entity.js'
import { TelegramLinkCode } from './telegram-link-code.entity.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramChat, TelegramLinkCode]),
    AuthModule,
    BusinessesModule,
  ],
  controllers: [TelegramController],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramModule {}
