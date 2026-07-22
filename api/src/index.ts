import { Hono } from 'hono'

import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { runExtractionPipeline } from './ExtractionPipeline'


export const MessageSchema = z.object({
  role: z.literal(['user', 'assistant']),
  content: z.string().nonempty(),
  reasoning_details: z.string().optional()
})
export type MessageType = z.infer<typeof MessageSchema>

export const MemorySchema = z.object({
  messages: MessageSchema.array().nonempty(),
})
export type MemoryType = z.infer<typeof MemorySchema>

const app = new Hono()

app.post('/add', zValidator('json', MemorySchema), async (ctx) => {
  const {messages} = ctx.req.valid('json')

  console.log(`Messages: ${messages}`)

  // 2. Run background worker used for entity extraction and graph making 
  // FOR PoC we will just use standard fire-and-forget approach
  runExtractionPipeline(messages)


  return ctx.json({error: null}, 200)
})

export default app
