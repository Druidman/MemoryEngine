import { zValidator } from "@hono/zod-validator";
import { app } from "../app";
import { callModel, GeneralModelParams } from "../openrouter/callModel";
import z from "zod";
import { UserMessageSchema } from "../types";
import { MemoryAddEndpoint } from "./add";

export const ChatSessionParamsSchema = z.object({
  session_id: z.uuid()
});
export const ChatSessionBodySchema = z.object({
  message: UserMessageSchema
});
const CHAT_MODEL_SYS_PROMPT = `
You are a chat model. That is literally it. Answer as you like it. I don't care
`;

app.post(
  "/session/:session_id/chat",
  zValidator("json", ChatSessionBodySchema),
  async (ctx) => {
    const { session_id } = ChatSessionParamsSchema.parse(await ctx.req.param());
    const { message } = ctx.req.valid("json");

    // check if user is allowed for chat, eg. is admin
    const { data, error } = await ctx.get('supabase')
      .from("admin_users")
      .select("created_at")
      .eq("user_id", ctx.get("user").id)
      .maybeSingle();

    if (error) return ctx.json({ error: error.message }, 500);
    if (!data) return ctx.json({ error: "Not authorized." }, 400);

    // Now that user is within admins, we can call chatter

    // Get session itself
    // get container id
    const { data: session, error: containerError } = await ctx.get('supabase')
      .from('sessions')
      .select('container_id')
      .eq('id', session_id)
      .single()

    if (containerError) {
      console.log(containerError)
      return ctx.json({ error: "Session was not found" }, 500)
    }

    // First get conversation history
    const { data: session_messages, error: sessionError } =
      await ctx.get('supabase')
        .from("session_messages")
        .select("payload")
        .eq("session_id", session_id);

    if (sessionError) return ctx.json({ error: sessionError.message }, 500);

    const messages = session_messages?.map((e) => e.payload) ?? [];

    if (!process.env.CHAT_MODEL) return ctx.json({ error: "Model not set" }, 500);

    const res = await callModel<GeneralModelParams>(
      process.env.CHAT_MODEL!,
      {
        messages: [...messages, message],
        sys_prompt: CHAT_MODEL_SYS_PROMPT,
      },
      "/session/:session_id/chat endpoint",
    );
    console.log(res)

    const memoryAddRes = await MemoryAddEndpoint({
      sessionId: session_id,
      containerId: session.container_id,
      newMessages: [message, { role: 'assistant', content: res.message as string }]
    }, ctx)

    if (memoryAddRes.status != 200) {
      return memoryAddRes
    }


    return ctx.json(res, 200);
  },
);
