import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { CurrentCustomer, OptionalAuthGuard } from '../auth/auth.guard.js'
import type { Business } from '../businesses/business.entity.js'
import { BusinessAccessGuard, CurrentBusiness } from '../businesses/business-access.guard.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type CreateReviewInput,
  createReviewSchema,
  type ReplyInput,
  type ReviewsQuery,
  replySchema,
  reviewsQuerySchema,
} from './reviews.schemas.js'
import { ReviewsService } from './reviews.service.js'

const TOKEN_HEADER = 'x-booking-token'
const SIGNATURE_HEADER = 'x-review-signature'

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  // A visit can be rated with its booking token (device), the SMS link signature or the account.
  @Get('bookings/:id/review')
  @UseGuards(OptionalAuthGuard)
  getForClient(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(TOKEN_HEADER) token: string | undefined,
    @Headers(SIGNATURE_HEADER) signature: string | undefined,
    @CurrentCustomer() customer: Customer | null,
  ) {
    return this.reviews.getForClient(id, {
      token: token ?? null,
      signature: signature ?? null,
      customer,
    })
  }

  @Post('bookings/:id/review')
  @UseGuards(OptionalAuthGuard)
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(TOKEN_HEADER) token: string | undefined,
    @Headers(SIGNATURE_HEADER) signature: string | undefined,
    @CurrentCustomer() customer: Customer | null,
    @Body({ schema: createReviewSchema }) body: CreateReviewInput,
  ) {
    return this.reviews.create(
      id,
      { token: token ?? null, signature: signature ?? null, customer },
      body,
    )
  }

  @Get('businesses/:slug/reviews')
  listPublic(
    @Param('slug') slug: string,
    @Query({ schema: reviewsQuerySchema }) query: ReviewsQuery,
  ) {
    return this.reviews.listPublic(slug, query.limit)
  }

  @Get('manage/:slug/reviews')
  @UseGuards(BusinessAccessGuard)
  listForManage(@CurrentBusiness() business: Business) {
    return this.reviews.listForManage(business)
  }

  @Put('manage/:slug/reviews/:id/reply')
  @UseGuards(BusinessAccessGuard)
  reply(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: replySchema }) body: ReplyInput,
  ) {
    return this.reviews.reply(business, id, body.text)
  }
}
