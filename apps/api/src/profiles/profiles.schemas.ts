import { z } from 'zod'
import { ACCENTS, BANNERS } from './profile-style.js'

const updateProfileStyleSchema = z.object({
  banner: z.enum(BANNERS).nullable().optional(),
  accent: z.enum(ACCENTS).nullable().optional(),
  status: z.string().trim().max(80).optional(),
  /** A single emoji (a grapheme of up to 16 code units) or empty. */
  statusEmoji: z
    .string()
    .trim()
    .max(16)
    .refine((value) => value === '' || /^\p{Extended_Pictographic}/u.test(value), 'Choose an emoji')
    .optional(),
  about: z.string().trim().max(160).optional(),
  /** `/u/<handle>`: latin letters, digits, «_» and «.», 3 to 20, starting with a letter or digit. */
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_.]{2,19}$/, 'Address: 3-20 Latin letters, digits, “_” or “.”')
    .nullable()
    .optional(),
  featuredBadges: z.array(z.string().max(32)).max(3).optional(),
  favoriteMasterId: z.string().max(64).nullable().optional(),
  /** Pasted handles or links; '' clears one (cleaned by `normalizeLinks`). */
  links: z
    .object({
      instagram: z.string().max(200).optional(),
      telegram: z.string().max(200).optional(),
      tiktok: z.string().max(200).optional(),
      website: z.string().max(200).optional(),
    })
    .optional(),
  isPublic: z.boolean().optional(),
  showPlaces: z.boolean().optional(),
})

type UpdateProfileStyleInput = z.infer<typeof updateProfileStyleSchema>

export type { UpdateProfileStyleInput }
export { updateProfileStyleSchema }
