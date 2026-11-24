import type {
  FunnelReport,
  FunnelSegmentsReport,
  FunnelSignalsReport,
  StrategyReport,
} from '@awaisa/contracts'
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { StrategyService } from './strategy.service.js'
import {
  type ClientErrorInput,
  clientErrorSchema,
  type FunnelEventsInput,
  type FunnelReportQuery,
  funnelEventsSchema,
  funnelReportSchema,
  telemetryReportSchema,
} from './telemetry.schemas.js'
import { TelemetryService } from './telemetry.service.js'

@Controller('telemetry')
export class TelemetryController {
  constructor(
    private readonly telemetry: TelemetryService,
    private readonly strategy: StrategyService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // The web sends funnel steps and errors with sendBeacon: 202, nothing to read back.
  @Post('events')
  @HttpCode(202)
  async events(@Body({ schema: funnelEventsSchema }) body: FunnelEventsInput) {
    await this.telemetry.recordSteps(body)
  }

  @Post('errors')
  @HttpCode(202)
  async error(
    @Body({ schema: clientErrorSchema }) body: ClientErrorInput,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    await this.telemetry.recordError('web', { ...body, userAgent })
  }

  // Platform admins: where people drop out of each flow (?flow=), for everyone or one kind of
  // device (?type=phone&textScale=large&net=slow…), and what breaks.
  @Get('funnel')
  @UseGuards(AuthGuard)
  funnel(
    @Query({ schema: funnelReportSchema }) query: FunnelReportQuery,
    @CurrentCustomer() customer: Customer,
  ): Promise<FunnelReport> {
    this.assertAdmin(customer)
    return this.telemetry.funnel(query)
  }

  @Get('signals')
  @UseGuards(AuthGuard)
  signals(
    @Query({ schema: telemetryReportSchema }) query: { days: number },
    @CurrentCustomer() customer: Customer,
  ): Promise<FunnelSignalsReport> {
    this.assertAdmin(customer)
    return this.telemetry.signals(query.days)
  }

  @Get('segments')
  @UseGuards(AuthGuard)
  segments(
    @Query({ schema: telemetryReportSchema }) query: { days: number },
    @CurrentCustomer() customer: Customer,
  ): Promise<FunnelSegmentsReport> {
    this.assertAdmin(customer)
    return this.telemetry.segments(query.days)
  }

  @Get('strategy')
  @UseGuards(AuthGuard)
  strategyReport(
    @Query({ schema: telemetryReportSchema }) query: { days: number },
    @CurrentCustomer() customer: Customer,
  ): Promise<StrategyReport> {
    this.assertAdmin(customer)
    return this.strategy.report(query.days)
  }

  @Get('errors')
  @UseGuards(AuthGuard)
  errors(
    @Query({ schema: telemetryReportSchema }) query: { days: number },
    @CurrentCustomer() customer: Customer,
  ) {
    this.assertAdmin(customer)
    return this.telemetry.errors(query.days)
  }

  private assertAdmin(customer: Customer) {
    if (!this.config.get('ADMIN_PHONES', { infer: true }).includes(customer.phone)) {
      throw new ForbiddenException('Platform admins only')
    }
  }
}
