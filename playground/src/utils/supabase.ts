
import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient(){
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}


export async function getSupabaseAccessTokenHeader(){
  const client = createSupabaseClient()
  const {data: {session}} = await client.auth.getSession()
  console.log(session)
  return {'Authorization':`Bearer ${session?.access_token}`}
}
