import app from ".."
import { supabaseServiceClient } from "../database/supabaseServiceClient"

app.get('/new_session', async (ctx) => {
  const { data: session, error } = await supabaseServiceClient.from('sessions').insert({}).select('id').single()

  if (error) return ctx.json({ error: error.message }, 500)

  return ctx.json({ error: null, session_id: session.id }, 200)
})