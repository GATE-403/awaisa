import { z } from 'zod'

const clientsQuerySchema = z.object({
  q: z.string().trim().max(80).default(''),
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
