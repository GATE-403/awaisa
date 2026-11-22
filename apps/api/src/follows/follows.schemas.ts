import { z } from 'zod'

const followSchema = z.object({
  /** Also hear about the master's new works (once a week at most). Left out: unchanged. */
  notifyWorks: z.boolean().optional(),
})

type FollowInput = z.infer<typeof followSchema>

export type { FollowInput }
export { followSchema }
