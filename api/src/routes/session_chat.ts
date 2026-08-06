import { zValidator } from "@hono/zod-validator"
import app from ".."
import { supabaseServiceClient } from "../database/supabaseServiceClient"
import { callModel, GeneralModelParams } from "../openrouter/callModel"
import z from "zod"
import { UserMessageSchema } from "../types"

export const ChatSessionParamsSchema = z.object({
  session_id: z.uuid()
})
export const ChatSessionBodySchema = z.object({
  message: UserMessageSchema
})
const CHAT_MODEL_SYS_PROMPT = `
You are a chat model. That is literally it. Answer as you like it. I don't care
`

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