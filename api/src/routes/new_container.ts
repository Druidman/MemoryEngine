import z from "zod";
import app from "..";
import { zValidator } from "@hono/zod-validator";

const NewContainerSchema = z.object({
  tag: z.string().min(1).max(40).optional()
})

app.get("/new_container", zValidator('json', NewContainerSchema), async (ctx) => {
  const {tag} = ctx.req.valid("json")

  const { data: container, error } = await ctx.get('supabase')
    .from("containers")
    .insert({
      tag
    })
    .select("id")
    .single();

  if (error) return ctx.json({ error: error.message }, 500);

  return ctx.json({ error: null, container_id: container.id }, 200);
});
