
import { setCookie } from 'hono/cookie'
import { createClient } from '@supabase/supabase-js'
import { Context } from 'hono'


export function createSupabaseClient(token: string) {


  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLIC_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  
  )
}