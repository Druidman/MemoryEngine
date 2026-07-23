import * as z from 'zod'


export const MemorySchema = z.object({
  id: z.uuid(),
  content: z.string(),
  container_id: z.uuid(),
  session_id: z.uuid().optional().nullable(),
  type: z.string(),
  created_at: z.iso.datetime()
})

export type Memory = z.infer<typeof MemorySchema>

