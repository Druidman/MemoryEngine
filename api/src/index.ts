import { Hono } from 'hono'

import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { runExtractionPipeline } from './ExtractionPipeline'
import { supabaseClient } from './supabaseClient'



export const MemorySchema = z.object({
  memories: z.string().min(1).array().min(1).max(10),
  // for now just to test if it works
  last_messages: z.string().array().min(1).max(10)
})
export type MemoryType = z.infer<typeof MemorySchema>

const app = new Hono()

app.post('/add_memories', zValidator('json', MemorySchema), async (ctx) => {
  const {memories, last_messages} = ctx.req.valid('json')

  console.log(`Memories: ${memories}`)
  console.log(`Last_messages: ${last_messages}`)
  // 1. insert memories to database
  const {data, error} = await supabaseClient
    .from('memories')
    .insert(memories.map((item)=>({
      content: item
    })))
    .select('id, content')

  if (error)
    return ctx.json({error: error.message}, 500)
  if (!data) 
    return ctx.json({error: "Did not receive data back from database"}, 500)

  // 2. Run background worker used for entity extraction and graph making 
  // FOR PoC we will just use standard fire-and-forget approach
  runExtractionPipeline(data || [], last_messages)


  return ctx.json({error: null}, 200)
})

export default app
