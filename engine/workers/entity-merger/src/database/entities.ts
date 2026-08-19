import z from "zod";

export const EntitySchema = z.object({
  id: z.uuid(),
  canonical_name: z.string(),
  type: z.string(),
  status: z.string(),
  confidence: z.number(),
  aliases: z.array(z.string()).default([]),
  embedding: z.array(z.number()).length(1024),
  container_id: z.uuid(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Entity = z.infer<typeof EntitySchema>
