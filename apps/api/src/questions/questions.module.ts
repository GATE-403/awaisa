import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { TelegramModule } from '../telegram/telegram.module.js'
import { QuestionsController } from './questions.controller.js'
import { QuestionsService } from './questions.service.js'

@Module({
  imports: [AuthModule, BusinessesModule, TelegramModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
