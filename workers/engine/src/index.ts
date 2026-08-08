

import { createSupabaseClient } from "./database/supabaseClient";
import { runExtractionPipeline } from "./engine/pipeline";
let cachedEnv: Env;
export default {
	async fetch(request: Request, env: Env) {
		cachedEnv = env;
		const {
			sessionId,
			containerId,
			messages,
			supabaseToken
		} = await request.json() as {
			sessionId: string,
			containerId: string,
			messages: any[],
			supabaseToken: string
		}
    await env.QUEUE.send({
      sessionId,
			containerId,
      messages,
			supabaseToken
    });
	
    return new Response('queued', { status: 202 });
  },
	async queue(batch: MessageBatch, env: Env) {
		cachedEnv = env;
    for (const message of batch.messages) {
      const { sessionId, containerId, messages, supabaseToken } = message.body as {
			sessionId: string,
			containerId: string,
			messages: any[],
			supabaseToken: string
		};
			const supabaseClient = createSupabaseClient(supabaseToken)
      await runExtractionPipeline(messages, sessionId, containerId, supabaseClient)
    }
  },
} satisfies ExportedHandler<Env>;

export function getEnv(): Env {
  return cachedEnv;
}