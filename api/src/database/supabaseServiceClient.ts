import { createClient } from '@supabase/supabase-js'

export const supabaseServiceClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)