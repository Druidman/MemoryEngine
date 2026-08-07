import { Context, Next } from "hono";
import { createSupabaseClient } from "./database/supabaseClient";


export async function authMiddleware(ctx: Context, next: Next){
  console.log('MIDDLEWARE')
  const authHeader = ctx.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return ctx.json({ error: 'Unauthorized (Missing token)' }, 401)

  const supabase = createSupabaseClient(token)
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    console.log(error)
    return ctx.json({ error: 'Unauthorized' }, 401)
  }
  console.log(supabase)
  ctx.set('user', user)
  ctx.set('supabase', supabase)
  ctx.set('token', token)

  await next()
}

