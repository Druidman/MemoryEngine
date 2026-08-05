import { Context, Hono } from 'hono'
import { logger } from 'hono/logger'

import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { runExtractionPipeline } from './engine/pipeline'
import { supabaseServiceClient } from './database/supabaseServiceClient'
import { authMiddleware } from './middleware'
import { SupabaseClient, User } from '@supabase/supabase-js'
import { callModel, GeneralModelParams } from './openrouter/callModel'

const CHAT_MODEL_SYS_PROMPT = `
You are a chat model. That is literally it. Answer as you like it. I don't care
`

export const MessageSchema = z.object({
  role: z.literal(['user', 'assistant']),
  content: z.string().nonempty(),
  reasoning_details: z.string().optional()
})
export type MessageType = z.infer<typeof MessageSchema>

export const UserMessageSchema = z.object({
  role: z.literal(['user']),
  content: z.string().nonempty(),
})
export const AddSchema = z.object({
  newMessages: MessageSchema.array().nonempty(),
  sessionId: z.uuid()
})
export type AddType = z.infer<typeof AddSchema>


type Env = {
  Variables: {
    user: User
    supabase: SupabaseClient
  }
}

const app = new Hono<Env>()
app.use(logger())
app.use(authMiddleware)

async function getContainerId() {
  const { data: container, error: containerError } = await supabaseServiceClient.from('containers').select('id').maybeSingle()

  if (containerError) throw containerError

  if (!container) {
    const { data: id, error: containerError } = await supabaseServiceClient
      .from('containers')
      .insert({
        tag: "TEST"
      })
      .select('id')
      .single()
    if (containerError) throw containerError

    return id.id
  }

  return container.id
}
app.post('/add', zValidator('json', AddSchema), async (ctx) => {
  const { newMessages, sessionId } = ctx.req.valid('json')

  // 1. check if session exist
  const { data: session, error: checkError } = await supabaseServiceClient.from('sessions').select('*').eq('id', sessionId).maybeSingle()

  if (checkError) return ctx.json({ error: checkError.message }, 500)
  if (!session) return ctx.json({ error: "SessionId does not exist! You can create one via: `new_session` endpoint" }, 400)

  // 2. Insert New Messages
  const { error: insertError } = await supabaseServiceClient.from('session_messages').insert(
    newMessages.map((message) => ({
      payload: message,
      session_id: sessionId
    }))
  )
  if (insertError) return ctx.json({ error: insertError.message }, 500)

  // 2. Run background worker used for entity extraction and graph making 
  // FOR PoC we will just use standard fire-and-forget approach
  // TODO
  // create/user first container
  const containerId = await getContainerId()


  runExtractionPipeline(newMessages, sessionId, containerId)


  return ctx.json({ error: null }, 200)
})

app.get('/new_session', async (ctx) => {
  const { data: session, error } = await supabaseServiceClient.from('sessions').insert({}).select('id').single()

  if (error) return ctx.json({ error: error.message }, 500)

  return ctx.json({ error: null, session_id: session.id }, 200)
})

export const ChatSessionParamsSchema = z.object({
  session_id: z.uuid()
})
export const ChatSessionBodySchema = z.object({
  message: UserMessageSchema
})

app.get('/session/:session_id/chat', zValidator('json', ChatSessionBodySchema), async (ctx)=>{
  const {session_id} = ChatSessionParamsSchema.parse(await ctx.req.param())
  const { message } = ctx.req.valid('json')
  // check if user is allowed for chat
  const {data, error} = await supabaseServiceClient
    .from('admin_users')
    .select('id')
    .eq('user_id', ctx.get('user').id)
    .maybeSingle()
  
  if (error) 
    ctx.json({ error: error.message }, 500)

  if (!data) 
    ctx.json({ error: "User not found on admins list" }, 400)

  // Now that user is within admins, we can call chatter

  // First get conversation history
  const {data: session_messages, error: sessionError} = await supabaseServiceClient
    .from('session_messages')
    .select('payload')
    .eq('session_id', session_id)
    
  
  if (sessionError) 
    ctx.json({ error: sessionError.message }, 500)

  const messages = session_messages?.map((e)=>e.payload) ?? []

  if (!process.env.CHAT_MODEL)
    ctx.json({ error: "Model not set" }, 500)

  const res = await callModel<GeneralModelParams>(process.env.CHAT_MODEL!, {
    messages: [...messages, message],
    sys_prompt: CHAT_MODEL_SYS_PROMPT
  }, '/session/:session_id/chat endpoint')

  // add model response to the database
  const {error: insertError} = await supabaseServiceClient
    .from('session_messages')
    .insert({
      session_id: session_id,
      payload: {
        role: 'assistant',
        content: res.message,
        reasoning: res.reasoning
      }
    })
  
  if (insertError)
    ctx.json({ error: insertError }, 500)

  return ctx.json(res, 200)

})

export default app
