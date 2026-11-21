import type {
  BulkReplyResult,
  CreatedReview,
  ManagedReview,
  ReviewerProfile,
  ReviewPhotos,
  ReviewReply,
  ReviewReplySettings,
  ReviewResolution,
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
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import { Cached } from '../cache/cached.decorator.js'
import type { Customer } from '../customers/customer.entity.js'
import { ReviewRepliesService } from './review-replies.service.js'
import {
  type BulkReplyInput,
  bulkReplySchema,
  type CreateReviewInput,
  createReviewSchema,
  type ReplyInput,
  type ReplySettingsInput,
  type ResolvedInput,
  type ReviewsQuery,
  replySchema,
  replySettingsSchema,
  resolvedSchema,
  reviewerIdSchema,
  reviewsQuerySchema,
} from './reviews.schemas.js'
import { ReviewsService } from './reviews.service.js'

const TOKEN_HEADER = 'x-booking-token'
const SIGNATURE_HEADER = 'x-review-signature'
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

@Controller()
export class ReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly replies: ReviewRepliesService,
  ) {}

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

  /** Staff read them too: the quick replies are offered above every reply field. */
  @Get('manage/:slug/reviews/settings')
  @UseGuards(BusinessAccessGuard)
  replySettings(@CurrentBusiness() business: Business): Promise<ReviewReplySettings> {
    return this.replies.getSettings(business)
  }

  @Put('manage/:slug/reviews/settings')
  @UseGuards(BusinessAccessGuard)
  @OwnerOnly()
  saveReplySettings(
    @CurrentBusiness() business: Business,
    @Body({ schema: replySettingsSchema }) body: ReplySettingsInput,
  ): Promise<ReviewReplySettings> {
    return this.replies.saveSettings(business, body)
  }

  /** Owners only: it publishes many replies at once. */
  @Post('manage/:slug/reviews/bulk-reply')
  @UseGuards(BusinessAccessGuard)
  @OwnerOnly()
  bulkReply(
    @CurrentBusiness() business: Business,
    @Body({ schema: bulkReplySchema }) body: BulkReplyInput,
  ): Promise<BulkReplyResult> {
    return this.replies.bulkReply(business, body)
  }

  @Put('manage/:slug/reviews/:id/resolved')
  @UseGuards(BusinessAccessGuard)
  setResolved(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: resolvedSchema }) body: ResolvedInput,
  ): Promise<ReviewResolution> {
    return this.reviews.setResolved(business, id, body.isResolved)
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
