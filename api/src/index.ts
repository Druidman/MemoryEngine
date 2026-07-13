import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'

import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const MemorySchema = z.object({
  memories: z.string().min(1).array().min(1).max(10),
  // for now just to test if it works
  last_messages: z.string().array().min(1).max(10)
})

const app = new Hono()

const supabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

app.post('/add_memories', zValidator('json', MemorySchema), (ctx) => {
  // 1. insert memories to database


  return ctx.text('Hello Hono!')
})

export default app
