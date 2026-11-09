import {
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import { bookingTokenSchema } from '../bookings/bookings.schemas.js'
import type { BookingView } from '../bookings/bookings.service.js'
import { BookingsService } from '../bookings/bookings.service.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { WalletService } from './wallet.service.js'

const TOKEN_HEADER = 'x-booking-token'

// Pass links go through the web app's /api rewrite, so they stay same-origin in the WebView too.
const API_BASE = '/api'

@Controller()
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly bookings: BookingsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get('wallet/config')
  getConfig() {
    return { apple: this.wallet.isAppleEnabled, google: this.wallet.isGoogleEnabled }
  }

  @Post('bookings/:id/wallet')
  @HttpCode(200)
  async linksByToken(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(TOKEN_HEADER) token: string | undefined,
  ) {
    const parsed = bookingTokenSchema.safeParse(token)
    if (!parsed.success) throw new NotFoundException('Запись не найдена')

    return this.links(await this.bookings.findByToken(id, parsed.data))
  }

  @Post('me/bookings/:id/wallet')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async linksForCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentCustomer() customer: Customer,
  ) {
    return this.links(await this.bookings.findForCustomer(id, customer))
  }

  @Get('wallet/apple/:id')
  @Header('Content-Type', 'application/vnd.apple.pkpass')
  @Header('Cache-Control', 'no-store')
  async applePass(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
  ) {
    this.wallet.verifyLink(id, String(expires), String(signature))
    const pass = await this.wallet.createApplePass(await this.bookings.getView(id))

    return new StreamableFile(pass, { disposition: 'attachment; filename="awaisa.pkpass"' })
  }

  private links(booking: BookingView) {
    return {
      ...this.wallet.createLinks(booking.id, API_BASE),
      google: this.wallet.createGoogleLink(
        booking,
        this.config.get('PUBLIC_WEB_URL', { infer: true }),
      ),
    }
  }
}
