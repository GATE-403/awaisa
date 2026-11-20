import { z } from 'zod'
import { MAX_QUICK_REPLIES, MAX_TEMPLATE_LENGTH } from './review-reply-text.js'

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default(''),
})

const replySchema = z.object({
  text: z.string().trim().max(1000),
})

const reviewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** Only reviews of this service (the booking form shows what people said about it). */
  serviceId: z.string().trim().min(1).max(64).optional(),
  /** With `serviceId`: only this master's (the «Работы» feed asks about one photo's master). */
  specialistId: z.string().trim().min(1).max(64).optional(),
})

const reviewerIdSchema = z.string().regex(/^[0-9a-f]{20}$/)

const replyTemplateSchema = z.string().trim().min(1).max(MAX_TEMPLATE_LENGTH)

const resolvedSchema = z.object({ isResolved: z.boolean() })

// Answers every unanswered review without words from `minRating` up with one template.
const bulkReplySchema = z.object({
  minRating: z.union([z.literal(4), z.literal(5)]),
  template: replyTemplateSchema,
})

const replySettingsSchema = z.object({
  autoReply: z.object({
    isEnabled: z.boolean(),
    minRating: z.union([z.literal(4), z.literal(5)]),
    template: replyTemplateSchema,
  }),
  quickReplies: z.array(replyTemplateSchema).max(MAX_QUICK_REPLIES),
})

type CreateReviewInput = z.infer<typeof createReviewSchema>
type ReplyInput = z.infer<typeof replySchema>
type ReviewsQuery = z.infer<typeof reviewsQuerySchema>
type ReplySettingsInput = z.infer<typeof replySettingsSchema>
type ResolvedInput = z.infer<typeof resolvedSchema>
type BulkReplyInput = z.infer<typeof bulkReplySchema>

export type {
  BulkReplyInput,
  CreateReviewInput,
  ReplyInput,
  ReplySettingsInput,
  ResolvedInput,
  ReviewsQuery,
}
export {
  bulkReplySchema,
  createReviewSchema,
  replySchema,
  replySettingsSchema,
  resolvedSchema,
  reviewerIdSchema,
  reviewsQuerySchema,
}
