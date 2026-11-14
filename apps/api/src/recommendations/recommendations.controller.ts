import type { Recommendation } from '@awaisa/contracts'
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
import { ConfigService } from '@nestjs/config'
import { AuthGuard, CurrentCustomer, OptionalAuthGuard } from '../auth/auth.guard.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type RecommendationEventsInput,
  type RecommendationStatsQuery,
  type RecommendationsQuery,
  recommendationEventsSchema,
  recommendationStatsSchema,
  recommendationsQuerySchema,
} from './recommendations.schemas.js'
import { RecommendationsService } from './recommendations.service.js'

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendations: RecommendationsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(
    @Query({ schema: recommendationsQuerySchema }) query: RecommendationsQuery,
    @CurrentCustomer() customer: Customer | null,
  ): Promise<Recommendation[]> {
    return this.recommendations.recommend(query, customer)
  }

  // Shown, tapped and booked picks, sent in batches by the shelves (sendBeacon).
  @Post('events')
  @HttpCode(202)
  @UseGuards(OptionalAuthGuard)
  events(
    @Body({ schema: recommendationEventsSchema }) body: RecommendationEventsInput,
    @CurrentCustomer() customer: Customer | null,
  ) {
    return this.recommendations.recordEvents(body, customer)
  }

  // Platform admins: which reasons bring taps and bookings, and a manual recount of affinities.
  @Get('stats')
  @UseGuards(AuthGuard)
  stats(
    @Query({ schema: recommendationStatsSchema }) query: RecommendationStatsQuery,
    @CurrentCustomer() customer: Customer,
  ) {
    this.assertAdmin(customer)
    return this.recommendations.stats(query.days)
  }

  @Post('affinities/refresh')
  @UseGuards(AuthGuard)
  async refresh(@CurrentCustomer() customer: Customer) {
    this.assertAdmin(customer)
    return { pairs: await this.recommendations.refreshAffinities() }
  }

  private assertAdmin(customer: Customer) {
    if (!this.config.get('ADMIN_PHONES', { infer: true }).includes(customer.phone)) {
      throw new ForbiddenException('Только для администраторов платформы')
    }
  }
}
