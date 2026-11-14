import { z } from 'zod'

const askSchema = z.object({
  text: z.string().trim().min(3, 'Напишите вопрос').max(500),
})

const answerSchema = z.object({
  text: z.string().trim().max(1000),
})

type AskInput = z.infer<typeof askSchema>
type AnswerInput = z.infer<typeof answerSchema>

export type { AnswerInput, AskInput }
export { answerSchema, askSchema }
