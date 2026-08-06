import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";
import * as z from 'zod'

export const EntitySchema = z.object({
  id: z.uuid(),
  canonical_name: z.string(),
  type: z.string(),
  confidence: z.number().min(0).max(1),
  aliases: z.array(z.string()),
  properties: z.record(z.string(), z.unknown()).nullable(),
  embedding_model: z.string().nullable(),
  container_id: z.uuid(),
  created_at: z.string(),
  updated_at: z.string(),
})
export const EntitiesSchema = z.array(EntitySchema)

export const RelationSchema = z.object({
  id: z.uuid(),
  subject_id: z.uuid().nullable(),
  object_id: z.uuid().nullable(),
  container_id: z.uuid().nullable(),
  memory_id: z.uuid().nullable(),
  superseededes: z.uuid().nullable(),
  relation: z.string(),
  confidence: z.number().min(0).max(1),
  created_at: z.string(),
  updated_at: z.string(),
})
export const RelationsSchema = z.array(RelationSchema)

export const MemorySchema = z.object({
  id: z.uuid(),
  session_id: z.uuid().nullable(),
  container_id: z.uuid(),
  content: z.string(),
  type: z.string(),
  confidence: z.number().min(0).max(1),
  metadata_hints: z.record(z.string(), z.unknown()).nullable(),
  embedding_model: z.string().nullable(),
  created_at: z.string(),
})
export const MemoriesSchema = z.array(MemorySchema)

export const EntireContainerGraphDataSchema = z.object({
  entities: EntitiesSchema,
  relations: RelationsSchema,
  memories: MemoriesSchema
})
export type EntireContainerGraphData = z.infer<typeof EntireContainerGraphDataSchema>

export default function useContainer(containerId?: string){
  const supabaseClient = useSupabase()

  const {
    data: containerData,
    isFetching,
    error
  } = useQuery({
    queryKey: ['container', containerId, 'data'],
    queryFn: async () => {
      const {data, error} = await supabaseClient
        .from('entire_container_graph')
        .select('*')
        .eq('container_id', containerId)
        .single()
        // .overrideTypes<EntireContainerGraphData[]>()
      
        if (error) throw error

        return data as EntireContainerGraphData
      
    },
    staleTime: Infinity, // realtime will refresh
    enabled: !!containerId
  })

  return {
    containerData,
    isFetching,
    error
  }
}