import z from "zod"

export const MessageSchema = z.object({
  role: z.literal(['user', 'assistant']),
  content: z.string().nonempty(),
  reasoning_details: z.string().optional()
})
export type MessageType = z.infer<typeof MessageSchema>

