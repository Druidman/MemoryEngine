import { Context, Next } from "hono";
import { createClient } from "./database/supabaseClient";


export async function authMiddleware(ctx: Context, next: Next){
  const supabase = createClient(ctx)
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) return ctx.json({ error: 'Unauthorized' }, 401)
  
  ctx.set('user', user)
  ctx.set('supabase', supabase)
  await next()
}

