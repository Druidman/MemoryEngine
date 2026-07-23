import { Hono } from 'hono'

import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { runExtractionPipeline } from './extraction/ExtractionPipeline'
import { supabaseClient } from './database/supabaseClient'


export const MessageSchema = z.object({
  role: z.literal(['user', 'assistant']),
  content: z.string().nonempty(),
  reasoning_details: z.string().optional()
})
export type MessageType = z.infer<typeof MessageSchema>

export const AddSchema = z.object({
  newMessages: MessageSchema.array().nonempty(),
  sessionId: z.uuid()
})
export type AddType = z.infer<typeof AddSchema>

const app = new Hono()

app.post('/add', zValidator('json', AddSchema), async (ctx) => {
  const {newMessages, sessionId} = ctx.req.valid('json')

  console.log(`New Messages: ${newMessages}`)
  // 1. check if session exist
  const {data: session, error} = await supabaseClient.from('sessions').select('*').eq('id', sessionId).maybeSingle()

  if (error) return ctx.json({error: error.message}, 500)
  if (!session) return ctx.json({error: "Session does not exist!"}, 300)

  // 2. Run background worker used for entity extraction and graph making 
  // FOR PoC we will just use standard fire-and-forget approach
  runExtractionPipeline(newMessages, sessionId)


  return ctx.json({error: null}, 200)
})

app.get('/new_session', async (ctx) => {
  

  const {data: session, error} = await supabaseClient.from('sessions').insert({}).select('id').single()

  if (error) return ctx.json({error: error.message}, 500)

  return ctx.json({error: null, session_id: session.id}, 200)
})

export default app
