import type {
  CreatedReview,
  ManagedReview,
  ReviewerProfile,
  ReviewPhotos,
  ReviewReply,
  ReviewSummary,
  VisitReview,
} from '@awaisa/contracts'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { CurrentCustomer, OptionalAuthGuard } from '../auth/auth.guard.js'
import type { Business } from '../businesses/business.entity.js'
import { BusinessAccessGuard, CurrentBusiness } from '../businesses/business-access.guard.js'
import { Cached } from '../cache/cached.decorator.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type CreateReviewInput,
  createReviewSchema,
  type ReplyInput,
  type ReviewsQuery,
  replySchema,
  reviewerIdSchema,
  reviewsQuerySchema,
} from './reviews.schemas.js'
import { ReviewsService } from './reviews.service.js'

const TOKEN_HEADER = 'x-booking-token'
const SIGNATURE_HEADER = 'x-review-signature'
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

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
  ): Promise<VisitReview> {
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
  ): Promise<CreatedReview> {
    return this.reviews.create(
      id,
      { token: token ?? null, signature: signature ?? null, customer },
      body,
    )
  }

  @Post('bookings/:id/review/photos')
  @UseGuards(OptionalAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
      fileFilter: (_request, file, accept) => accept(null, file.mimetype.startsWith('image/')),
    }),
  )
  addPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(TOKEN_HEADER) token: string | undefined,
    @Headers(SIGNATURE_HEADER) signature: string | undefined,
    @CurrentCustomer() customer: Customer | null,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ): Promise<ReviewPhotos> {
    if (!file) throw new BadRequestException('Выберите фото')
    return this.reviews.addPhoto(
      id,
      { token: token ?? null, signature: signature ?? null, customer },
      file.buffer,
    )
  }

  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 30 })
  @Get('businesses/:slug/reviews')
  listPublic(
    @Param('slug') slug: string,
    @Query({ schema: reviewsQuerySchema }) query: ReviewsQuery,
  ): Promise<ReviewSummary> {
    return this.reviews.listPublic(slug, query.limit, query.serviceId, query.specialistId)
  }

  // Another client's public page: their reviews across places, opened from a review.
  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 30 })
  @Get('reviewers/:id')
  reviewer(@Param('id') id: string): Promise<ReviewerProfile> {
    if (!reviewerIdSchema.safeParse(id).success) throw new NotFoundException('Профиль не найден')
    return this.reviews.reviewer(id)
  }

  @Get('manage/:slug/reviews')
  @UseGuards(BusinessAccessGuard)
  listForManage(@CurrentBusiness() business: Business): Promise<ReviewSummary<ManagedReview>> {
    return this.reviews.listForManage(business)
  }

  @Put('manage/:slug/reviews/:id/reply')
  @UseGuards(BusinessAccessGuard)
  reply(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: replySchema }) body: ReplyInput,
  ): Promise<ReviewReply> {
    return this.reviews.reply(business, id, body.text)
  }
}
