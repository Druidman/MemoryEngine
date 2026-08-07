
import { setCookie } from 'hono/cookie'
import { createClient } from '@supabase/supabase-js'
import { Context } from 'hono'
import { getEnv } from '..'


export function createSupabaseClient(token: string) {


  return createClient(
    getEnv().SUPABASE_URL!,
    getEnv().SUPABASE_PUBLIC_KEY!,
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