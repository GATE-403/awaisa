import type { ModerationDecision, ModerationLog, ModerationQueue } from '@awaisa/contracts'
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard, CurrentCustomer, OptionalAuthGuard } from '../auth/auth.guard.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type DecisionBody,
  decisionSchema,
  type LogQuery,
  logQuerySchema,
  type ReportBody,
  reportSchema,
} from './moderation.schemas.js'
import { ModerationService } from './moderation.service.js'

@Controller()
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  // A viewer reports a work photo, a review or a profile: by account when signed in, else by the
  // device session. 204 either way, so a second tap tells nothing.
  @Post('reports')
  @HttpCode(204)
  @UseGuards(OptionalAuthGuard)
  async report(
    @Body({ schema: reportSchema }) body: ReportBody,
    @CurrentCustomer() customer: Customer | null,
  ) {
    await this.moderation.report(body, customer)
  }

  @Get('moderation/queue')
  @UseGuards(AuthGuard)
  queue(@CurrentCustomer() customer: Customer): Promise<ModerationQueue> {
    this.assertAdmin(customer)
    return this.moderation.queue()
  }

  @Get('moderation/decisions')
  @UseGuards(AuthGuard)
  log(
    @Query({ schema: logQuerySchema }) query: LogQuery,
    @CurrentCustomer() customer: Customer,
  ): Promise<ModerationLog> {
    this.assertAdmin(customer)
    return this.moderation.log(query.limit)
  }

  @Post('moderation/decisions')
  @UseGuards(AuthGuard)
  decide(
    @Body({ schema: decisionSchema }) body: DecisionBody,
    @CurrentCustomer() customer: Customer,
  ): Promise<ModerationDecision> {
    this.assertAdmin(customer)
    return this.moderation.decide(customer, body)
  }

  private assertAdmin(customer: Customer) {
    if (!this.moderation.isAdmin(customer)) {
      throw new ForbiddenException('Только для администраторов платформы')
    }
  }
}
