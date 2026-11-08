import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(120),
})

type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export type { UpdateProfileInput }
export { updateProfileSchema }
