import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { CurrentCustomer, OptionalAuthGuard } from '../auth/auth.guard.js'
import type { Customer } from '../customers/customer.entity.js'
import { type RecommendationsQuery, recommendationsQuerySchema } from './recommendations.schemas.js'
import { RecommendationsService } from './recommendations.service.js'

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(
    @Query({ schema: recommendationsQuerySchema }) query: RecommendationsQuery,
    @CurrentCustomer() customer: Customer | null,
  ) {
    return this.recommendations.recommend(query, customer)
  }
}
