import { zValidator } from "@hono/zod-validator";
import { app } from "../app";
import { MessageSchema } from "../types";
import z from "zod";
import { Context } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const AddSchema = z.object({
  newMessages: MessageSchema.array().nonempty(),
  sessionId: z.uuid(),
  containerId: z.uuid()
});
export type AddType = z.infer<typeof AddSchema>;

export async function MemoryAddEndpoint(params: AddType, ctx: Context){
  const { newMessages, sessionId, containerId } = params

  // check if admin
  const { data, error } = await ctx.get('supabase')
      .from("admin_users")
      .select("created_at")
      .eq("user_id", ctx.get("user").id)
      .maybeSingle();

  if (error) return ctx.json({ error: error.message }, 500);
  if (!data) return ctx.json({ error: "Not authorized." }, 400);

  console.log('ADD MEMORY ENDPOINT')
  // 1. check if session exist
  const { data: session, error: checkError } = await ctx.get('supabase')
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("container_id", containerId)
    .maybeSingle();

  if (checkError) return ctx.json({ error: checkError.message }, 500);
  if (!session)
    return ctx.json(
      {
        error:
          `Session with id: ${sessionId} and container: ${containerId}: Does not exist. Use '/new_session' to create new session`,
      },
      400,
    );

  // 2. Insert New Messages
  const { error: insertError } = await ctx.get('supabase')
    .from("session_messages")
    .insert(
      newMessages.map((message) => ({
        payload: message,
        session_id: sessionId,
      })),
    );
  if (insertError) return ctx.json({ error: insertError.message }, 500);

  // 2. Run background worker used for entity extraction and graph making
  // FOR PoC we will just use standard fire-and-forget approach
  console.log('RUNNING PIPELINE')
  // runExtractionPipeline(newMessages, sessionId, containerId, ctx.get('supabase'));
  const response = await fetch(process.env.WORKER_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionId,
      containerId: containerId,
      messages: newMessages,
      supabaseToken: ctx.get('token'),
    }),
  });

  if (response.status != 202){
    return ctx.json({error: await response.text() ?? 'ERROR IN ENGINE WORKER QUEUE'}, 500)
  }

  return ctx.json({ error: null }, 200);
}

app.post("/add", zValidator("json", AddSchema), async (ctx) => {

  return await MemoryAddEndpoint(ctx.req.valid("json"), ctx)
});
