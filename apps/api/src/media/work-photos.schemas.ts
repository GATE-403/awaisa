import { z } from 'zod'

const ID = z.string().trim().min(1).max(64)

const updateWorkPhotoSchema = z.object({
  serviceId: ID.nullable(),
  specialistId: ID.nullable(),
  isHidden: z.boolean(),
})

const feedQuerySchema = z.object({
  kind: z.string().trim().max(32).optional(),
  business: z.string().trim().max(64).optional(),
  start: z.string().uuid().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
})

// The device's random session (`awaisa:device:v1`): one like per photo and device, no account.
const likeSchema = z.object({
  session: z
    .string()
    .trim()
    .regex(/^[0-9a-f-]{8,64}$/i),
})

type LikeInput = z.infer<typeof likeSchema>
type UpdateWorkPhotoInput = z.infer<typeof updateWorkPhotoSchema>
type FeedQuery = z.infer<typeof feedQuerySchema>

export type { FeedQuery, LikeInput, UpdateWorkPhotoInput }
export { feedQuerySchema, likeSchema, updateWorkPhotoSchema }
