import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SkipThrottle } from '@nestjs/throttler'
import { CurrentCustomer } from '../auth/auth.guard.js'
import type { Business } from '../businesses/business.entity.js'
import { BusinessAccessGuard, CurrentBusiness } from '../businesses/business-access.guard.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { TelegramBotService } from './telegram-bot.service.js'

@Controller()
export class TelegramController {
  constructor(
    private readonly bot: TelegramBotService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get('manage/:slug/telegram')
  @UseGuards(BusinessAccessGuard)
  async status(@CurrentBusiness() business: Business) {
    return {
      isAvailable: this.bot.isAvailable,
      botUsername: this.bot.botUsername,
      chats: this.bot.isAvailable ? await this.bot.listChats(business.id) : [],
    }
  }

  @Post('manage/:slug/telegram/link')
  @UseGuards(BusinessAccessGuard)
  createLink(@CurrentBusiness() business: Business, @CurrentCustomer() customer: Customer | null) {
    if (!this.bot.isAvailable) throw new ForbiddenException('Telegram-бот не настроен')
    return this.bot.createLink(business.id, customer?.id ?? null)
  }

  @Delete('manage/:slug/telegram/:id')
  @UseGuards(BusinessAccessGuard)
  @HttpCode(204)
  async remove(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    await this.bot.removeChat(business.id, id)
  }

  // Telegram calls this when TELEGRAM_WEBHOOK_URL is set; the secret proves it is Telegram.
  @Post('telegram/webhook')
  @SkipThrottle()
  @HttpCode(200)
  async webhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: Parameters<TelegramBotService['handleUpdate']>[0],
  ) {
    const expected = this.config.get('TELEGRAM_WEBHOOK_SECRET', { infer: true })
    if (!expected || secret !== expected) throw new ForbiddenException()
    await this.bot.handleUpdate(update)
    return { ok: true }
  }
}
