import { zValidator } from "@hono/zod-validator"
import app from ".."
import { supabaseServiceClient } from "../database/supabaseServiceClient"
import { runExtractionPipeline } from "../engine/pipeline"
import { MessageSchema } from "../types"
import z from "zod"

export const AddSchema = z.object({
  newMessages: MessageSchema.array().nonempty(),
  sessionId: z.uuid()
})
export type AddType = z.infer<typeof AddSchema>


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