import { z } from 'zod'

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

type CreateReviewInput = z.infer<typeof createReviewSchema>
type ReplyInput = z.infer<typeof replySchema>
type ReviewsQuery = z.infer<typeof reviewsQuerySchema>

export type { CreateReviewInput, ReplyInput, ReviewsQuery }
export { createReviewSchema, replySchema, reviewerIdSchema, reviewsQuerySchema }
