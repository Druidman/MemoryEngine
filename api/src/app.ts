// app.ts
import { Hono } from 'hono'
import { SupabaseClient, User } from '@supabase/supabase-js'

type Env = {
  Variables: {
    user: User
    supabase: SupabaseClient
    token: string
  }
}

export const app = new Hono<Env>()