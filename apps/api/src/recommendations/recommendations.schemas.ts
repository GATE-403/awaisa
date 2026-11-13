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
  limit: z.coerce.number().int().min(1).max(24).default(12),
})

type RecommendationsQuery = z.infer<typeof recommendationsQuerySchema>

export type { RecommendationsQuery }
export { recommendationsQuerySchema }
