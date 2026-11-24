import type { WaitlistEntry } from '@awaisa/contracts'
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthGuard, CurrentCustomer, OptionalAuthGuard } from '../auth/auth.guard.js'
import { validateEnv } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type JoinWaitlistInput,
  joinWaitlistSchema,
  waitlistTokenSchema,
} from './waitlist.schemas.js'
import { WaitlistService } from './waitlist.service.js'

const TOKEN_HEADER = 'x-waitlist-token'

const getRateLimit = () => validateEnv(process.env).BOOKING_RATE_LIMIT_PER_MINUTE

const parseToken = (value: string | undefined) => {
  const result = waitlistTokenSchema.safeParse(value)
  if (!result.success) throw new NotFoundException('Not found')

  return result.data
}

@Controller()
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Post('waitlist')
  @Throttle({ default: { limit: getRateLimit, ttl: 60_000 } })
  @UseGuards(OptionalAuthGuard)
  join(
    @Body({ schema: joinWaitlistSchema }) body: JoinWaitlistInput,
    @CurrentCustomer() customer: Customer | null,
  ): Promise<WaitlistEntry & { token: string }> {
    return this.waitlist.join(body, customer)
  }

  @Get('waitlist/:id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(TOKEN_HEADER) token: string | undefined,
  ): Promise<WaitlistEntry> {
    return this.waitlist.findByToken(id, parseToken(token))
  }

  @Delete('waitlist/:id')
  leave(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(TOKEN_HEADER) token: string | undefined,
  ): Promise<WaitlistEntry> {
    return this.waitlist.leave(id, parseToken(token))
  }

  @Get('me/waitlist')
  @UseGuards(AuthGuard)
  listMine(@CurrentCustomer() customer: Customer): Promise<WaitlistEntry[]> {
    return this.waitlist.listForCustomer(customer)
  }

  @Delete('me/waitlist/:id')
  @UseGuards(AuthGuard)
  leaveMine(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentCustomer() customer: Customer,
  ): Promise<WaitlistEntry> {
    return this.waitlist.leaveForCustomer(id, customer)
  }
}
