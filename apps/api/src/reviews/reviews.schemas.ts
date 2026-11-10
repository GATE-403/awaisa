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
})

type CreateReviewInput = z.infer<typeof createReviewSchema>
type ReplyInput = z.infer<typeof replySchema>
type ReviewsQuery = z.infer<typeof reviewsQuerySchema>

export type { CreateReviewInput, ReplyInput, ReviewsQuery }
export { createReviewSchema, replySchema, reviewsQuerySchema }
