import type {
  Customer,
  OtpRequest,
  TelegramLoginConfig,
  TelegramLoginState,
} from '@awaisa/contracts'
import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { type Env, validateEnv } from '../config/env.js'
import { toCustomerView } from '../customers/customer-view.js'
import { SESSION_COOKIE, SESSION_TTL_DAYS } from './auth.constants.js'
import { readSessionToken } from './auth.guard.js'
import {
  type RequestCodeInput,
  requestCodeSchema,
  type TelegramLoginInput,
  telegramLoginSchema,
  type VerifyCodeInput,
  verifyCodeSchema,
} from './auth.schemas.js'
import { AuthService } from './auth.service.js'
import { TelegramLoginService } from './telegram-login.service.js'

const DAY_MS = 24 * 60 * 60 * 1000

const getCodeRateLimit = () => validateEnv(process.env).AUTH_RATE_LIMIT_PER_MINUTE

const getVerifyRateLimit = () => getCodeRateLimit() * 2

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly telegramLogin: TelegramLoginService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('otp')
  @HttpCode(200)
  @Throttle({ default: { limit: getCodeRateLimit, ttl: 60_000 } })
  requestCode(@Body({ schema: requestCodeSchema }) body: RequestCodeInput): Promise<OtpRequest> {
    return this.auth.requestCode(body.phone, body.channel)
  }

  @Post('verify')
  @HttpCode(200)
  @Throttle({ default: { limit: getVerifyRateLimit, ttl: 60_000 } })
  async verify(
    @Body({ schema: verifyCodeSchema }) body: VerifyCodeInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Customer> {
    const { token, customer } = await this.auth.verifyCode(body.phone, body.code)
    this.setSession(response, token)

    return toCustomerView(customer, this.config.get('ADMIN_PHONES', { infer: true }))
  }

  @Get('telegram')
  telegramConfig(): TelegramLoginConfig {
    const botUsername = this.telegramLogin.botUsername
    return { isAvailable: Boolean(botUsername), botUsername }
  }

  @Post('telegram')
  @HttpCode(204)
  @Throttle({ default: { limit: getCodeRateLimit, ttl: 60_000 } })
  async startTelegram(@Body({ schema: telegramLoginSchema }) body: TelegramLoginInput) {
    await this.telegramLogin.register(body.token)
  }

  // Polled by the page every few seconds while the person shares their number in the bot.
  @Post('telegram/check')
  @HttpCode(200)
  async checkTelegram(
    @Body({ schema: telegramLoginSchema }) body: TelegramLoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TelegramLoginState> {
    const result = await this.telegramLogin.check(body.token)
    if (result.status !== 'signedIn') return { status: result.status }
    this.setSession(response, result.session.token)

    return {
      status: 'signedIn',
      customer: toCustomerView(
        result.session.customer,
        this.config.get('ADMIN_PHONES', { infer: true }),
      ),
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(readSessionToken(request))
    response.clearCookie(SESSION_COOKIE, { path: '/' })
  }

  private setSession(response: Response, token: string) {
    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      path: '/',
      maxAge: SESSION_TTL_DAYS * DAY_MS,
    })
  }
}
