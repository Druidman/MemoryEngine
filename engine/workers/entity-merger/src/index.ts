
export default {

	async fetch(req, env, ctx): Promise<Response> {
		return new Response('Received')
	},
	async queue(batch, env): Promise<void> {
		
	},
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext,
	) {
		console.log("cron processed");
	}
} satisfies ExportedHandler<Env, Error>;
