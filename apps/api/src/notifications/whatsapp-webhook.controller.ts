import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  type RawBodyRequest,
  Req,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SkipThrottle } from '@nestjs/throttler'
import type { Request } from 'express'
import { maskPhone } from '../common/phone.js'
import type { Env } from '../config/env.js'
import { failedDeliveries, isValidSignature, type WebhookBody } from './whatsapp-webhook.js'

/** Delivery statuses from Meta: failures are logged, so a template that stopped working shows up. */
@Controller('whatsapp/webhook')
@SkipThrottle()
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name)

  constructor(private readonly config: ConfigService<Env, true>) {}

  // Meta checks the address once when the webhook is set up and expects the challenge back.
  @Get()
  @Header('Content-Type', 'text/plain')
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
  ) {
    const expected = this.config.get('WHATSAPP_VERIFY_TOKEN', { infer: true })
    if (!expected || mode !== 'subscribe' || token !== expected) throw new ForbiddenException()
    return challenge ?? ''
  }

  @Post()
  @HttpCode(200)
  receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() body: WebhookBody,
  ) {
    const secret = this.config.get('WHATSAPP_APP_SECRET', { infer: true })
    if (!(secret && request.rawBody && isValidSignature(request.rawBody, signature, secret))) {
      throw new ForbiddenException()
    }
    for (const failure of failedDeliveries(body)) {
      this.logger.warn(
        `WhatsApp message ${failure.messageId} to ${maskPhone(`+${failure.recipient}`)} not delivered: ${failure.reason}`,
      )
    }
    return { ok: true }
  }
}
