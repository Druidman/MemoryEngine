import { Entity } from "./database/entities";
import { createSupabaseServiceClient } from "./database/supabaseServiceClient";
import { handleEntitiesMerge } from "./handleEntitiesMerge";


let sharedEnv: Env | undefined = undefined;


export default {
	async queue(batch: MessageBatch, env): Promise<void> {
		sharedEnv = env
		const promises = []
		for (const message of batch.messages){
			const {entities} = message.body as {
				entities: Entity[]
			}
			// batch to ingest
			// we will do it all at once so just fire all of them and hope for the best
			promises.push(await handleEntitiesMerge(entities))
		}


		const results = await Promise.all(promises)

		console.log(`FINISHED QUEUE BATCHES WORK. BATCH NUM: ${batch.messages.length}`)
		
	},
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext,
	) {
		sharedEnv = env
		// First get all entities that are marked as needed for merge
		const {data, error} = await createSupabaseServiceClient()
			.from('entities')
			.select('*')
			.eq('status', 'awaiting_merge')
			.limit(100) // max batch limit
		if (error) throw error

		if (!data) {
			console.log("cron processed without queue call");
			return;
		}

		// now we need to mark them as queued for merge 
		
		const {error: updateError} = await createSupabaseServiceClient()
			.rpc('update_entities_status', {p_entities: data.map((entity)=>({id: entity.id, status: 'queued_for_merge'}))})

		if (updateError) throw updateError


		await env.QUEUE.send({entities: data.map((entity)=>({...entity, status: 'queued_for_merge'}))});
		
	}
} satisfies ExportedHandler<Env, Error>;

export function getEnv(){
	if (!sharedEnv)
		throw new Error('getEnv invoked before any internal worker call is prohibited')
	return sharedEnv
}
