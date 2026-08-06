import { zValidator } from "@hono/zod-validator";
import app from "..";
import { runExtractionPipeline } from "../engine/pipeline";
import { MessageSchema } from "../types";
import z from "zod";

export const AddSchema = z.object({
  newMessages: MessageSchema.array().nonempty(),
  sessionId: z.uuid(),
  containerId: z.uuid()
});
export type AddType = z.infer<typeof AddSchema>;


app.post("/add", zValidator("json", AddSchema), async (ctx) => {
  const { newMessages, sessionId, containerId } = ctx.req.valid("json");

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

  runExtractionPipeline(newMessages, sessionId, containerId, ctx.get('supabase'));

  return ctx.json({ error: null }, 200);
});
