import { zValidator } from "@hono/zod-validator";
import { app } from "../app";
import z from "zod";

const NewSessionSchema = z.object({
  container_id: z.uuid()
})
app.post("/new_session", zValidator("json", NewSessionSchema), async (ctx) => {
  const { container_id } = ctx.req.valid("json");
  const { data: session, error } = await ctx.get('supabase')
    .from("sessions")
    .insert({
      container_id
    })
    .select("id")
    .single();

  if (error) {
    console.log(error)
    return ctx.json({ error: error.message }, 500);
  }

  return ctx.json({ error: null, session_id: session.id }, 200);
});
