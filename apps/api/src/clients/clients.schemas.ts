import { z } from 'zod'

const clientsQuerySchema = z.object({
  q: z.string().trim().max(80).default(''),
  segment: z
    .enum(['all', 'upcoming', 'new', 'regular', 'lapsed', 'noShows', 'birthday'])
    .default('all'),
  sort: z.enum(['recent', 'spent', 'visits', 'name']).default('recent'),
  // The rows asked for: the list loads 200 at a time as «Ещё N клиентов» reaches them.
  limit: z.coerce.number().int().min(1).max(5000).default(200),
})

const updateClientSchema = z.object({
  note: z.string().trim().max(2000),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
})

type ClientsQuery = z.infer<typeof clientsQuerySchema>
type UpdateClientInput = z.infer<typeof updateClientSchema>

export type { ClientsQuery, UpdateClientInput }
export { clientsQuerySchema, updateClientSchema }
