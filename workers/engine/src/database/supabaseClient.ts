
import { createClient } from '@supabase/supabase-js'
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