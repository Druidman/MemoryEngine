import { createClient } from '@supabase/supabase-js'
import { getEnv } from '..'

export const supabaseServiceClient = createClient(
  getEnv().SUPABASE_URL!,
  getEnv().SUPABASE_SECRET_KEY!
)