import {Hono } from 'hono'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware'
import { SupabaseClient, User } from '@supabase/supabase-js'


type Env = {
  Variables: {
    user: User
    supabase: SupabaseClient
  }
}

const app = new Hono<Env>()
app.use(logger())
app.use(authMiddleware)


export default app
