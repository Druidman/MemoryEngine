import { createClient } from '@supabase/supabase-js'
import { getEnv } from '..'
 // use only when really required OR for quick testing 
 // keep in mind that using that is not a good practice generally because it means
 // that you are saying: "I will handle security here", which is Okay....
 // BUT that means that you have a single point of security failure instead of db, api you have just api
export function createSupabaseServiceClient(){
  return createClient(
    getEnv().SUPABASE_URL!,
    getEnv().SUPABASE_SECRET_KEY!
  )
}