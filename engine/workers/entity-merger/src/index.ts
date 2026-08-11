
export default {

	async fetch(req, env, ctx): Promise<Response> {
		return new Response('Received')
	},
	async queue(batch, env): Promise<void> {
		
	},
} satisfies ExportedHandler<Env, Error>;
