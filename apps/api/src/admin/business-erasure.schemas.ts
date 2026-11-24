import { z } from 'zod'

// 'Delete business' asks for the page's address typed by hand, like deleting a repository on
// GitHub: a child with the phone, or a stray tap, cannot delete a business.
const deleteBusinessSchema = z.object({ confirmSlug: z.string().trim().max(64) })

type DeleteBusinessInput = z.infer<typeof deleteBusinessSchema>

export type { DeleteBusinessInput }
export { deleteBusinessSchema }
