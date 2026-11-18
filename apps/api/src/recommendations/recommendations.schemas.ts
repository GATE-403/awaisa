import { z } from 'zod'
import { INTERESTS } from './recommend-score.js'

const list = (value: unknown) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

const recommendationsQuerySchema = z.object({
  interests: z
    .preprocess(list, z.array(z.enum(INTERESTS as [string, ...string[]])).max(9))
    .default([]),
  gender: z.enum(['male', 'female']).optional(),
  budget: z.coerce.number().int().min(100).max(1_000_000).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  /** Device visits as `serviceId~YYYY-MM-DD`, newest first. */
  visits: z.preprocess(list, z.array(z.string().max(120)).max(30)).default([]),
  /** The service being chosen (the booking form): picks follow it. */
  like: z.string().trim().min(1).max(64).optional(),
  /** Services looked at on this device lately, newest first. */
  recent: z.preprocess(list, z.array(z.string().max(64)).max(5)).default([]),
  /** A random id per device: what was already shown here steps aside. */
  session: z
    .string()
    .regex(/^[A-Za-z0-9-]{8,40}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(24).default(12),
})

const recommendationEventsSchema = z.object({
  session: z.string().regex(/^[A-Za-z0-9-]{8,40}$/),
  events: z
    .array(
      z.object({
        kind: z.enum(['impression', 'click', 'book']),
        serviceId: z.string().min(1).max(64),
        reason: z.string().max(80).default(''),
        surface: z.enum(['catalog', 'profile', 'booking', 'success']),
        position: z.number().int().min(0).max(100).optional(),
        /** The answer the card came from (`requestId` of GET /recommendations). */
        requestId: z.uuid().optional(),
        algorithm: z
          .string()
          .regex(/^[a-z0-9.-]{1,24}$/)
          .optional(),
        /** On `book`: the booking the pick led to. */
        bookingId: z.uuid().optional(),
      }),
    )
    .min(1)
    .max(50),
})

const recommendationStatsSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
})

type RecommendationsQuery = z.infer<typeof recommendationsQuerySchema>
type RecommendationEventsInput = z.infer<typeof recommendationEventsSchema>
type RecommendationStatsQuery = z.infer<typeof recommendationStatsSchema>

export type { RecommendationEventsInput, RecommendationStatsQuery, RecommendationsQuery }
export { recommendationEventsSchema, recommendationStatsSchema, recommendationsQuerySchema }
