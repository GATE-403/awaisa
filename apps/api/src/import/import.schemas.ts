import { z } from 'zod'

const CELL = z.string().trim().max(500).default('')

const importClientsSchema = z.object({
  clients: z
    .array(z.object({ name: CELL, phone: CELL, birthday: CELL, note: CELL }))
    .min(1)
    .max(5000),
})

const importBookingsSchema = z.object({
  bookings: z
    .array(
      z.object({
        date: CELL,
        time: CELL,
        service: CELL,
        master: CELL,
        name: CELL,
        phone: CELL,
        comment: CELL,
      }),
    )
    .min(1)
    .max(2000),
  /** Remind the clients by SMS before the visit, as for bookings made here. */
  remind: z.boolean().default(true),
})

type ImportClientsInput = z.infer<typeof importClientsSchema>
type ImportBookingsInput = z.infer<typeof importBookingsSchema>

export type { ImportBookingsInput, ImportClientsInput }
export { importBookingsSchema, importClientsSchema }
