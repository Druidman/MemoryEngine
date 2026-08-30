

import { createSupabaseClient } from "./database/supabaseClient";
import { runExtractionPipeline } from "./engine/pipeline";
import { inspect } from 'util';

function handleConfig(){
	if (getEnv().ENVIRONMENT == 'dev'){
		inspect.defaultOptions.depth = null;
	}
}
let sharedEnv: Env;

export default {
	async fetch(request: Request, env: Env) {
		sharedEnv = env;
		handleConfig()


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
		sharedEnv = env;
		handleConfig()


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

export function getEnv(){
	if (!sharedEnv)
		throw new Error('getEnv invoked before any internal worker call is prohibited')
	return sharedEnv
}