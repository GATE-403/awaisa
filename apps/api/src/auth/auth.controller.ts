import type { Customer, OtpRequest } from '@awaisa/contracts'
import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common'
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
  type VerifyCodeInput,
  verifyCodeSchema,
} from './auth.schemas.js'
import { AuthService } from './auth.service.js'

const DAY_MS = 24 * 60 * 60 * 1000

const getCodeRateLimit = () => validateEnv(process.env).AUTH_RATE_LIMIT_PER_MINUTE

const getVerifyRateLimit = () => getCodeRateLimit() * 2

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
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
    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      path: '/',
      maxAge: SESSION_TTL_DAYS * DAY_MS,
    })

    return toCustomerView(customer, this.config.get('ADMIN_PHONES', { infer: true }))
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(readSessionToken(request))
    response.clearCookie(SESSION_COOKIE, { path: '/' })
  }
}
