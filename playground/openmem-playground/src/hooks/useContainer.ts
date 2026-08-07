import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";
import * as z from 'zod'
import { useAuth } from "./useAuth";
import { getSupabaseAccessTokenHeader } from "../utils/supabase";

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

export const ContainerSchema = z.object({
  id : z.uuid(),
  tag: z.string(),
  owner_id: z.uuid(),
  created_at: z.string(),
  updated_at: z.string()
})
export type Container = z.infer<typeof ContainerSchema>

export function useContainer(containerId?: string){
  const {user} = useAuth()
  const queryClient = useQueryClient()
  const supabaseClient = useSupabase()

  const {
    data: containerData,
    isFetching: isFetchingContainerData,
    error: containerDataError,
    refetch: refetchContainerData
  } = useQuery({
    queryKey: ['container', user?.id, containerId, 'data'],
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
    enabled: !!containerId && !!user?.id
  })


  const createContainerMutation = useMutation({
    mutationFn: async (tag: string) => {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/new_container', {
        method: 'POST',
        // credentials: "include",
        headers: { 'Content-Type': 'application/json', ...(await getSupabaseAccessTokenHeader()) },
        body: JSON.stringify({ tag }),
      })
      if (!response.ok) throw new Error('Failed to create container')
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['containers', user?.id] })
    },
  })

  return {
    containerData,
    isFetchingContainerData,
    containerDataError,
    refetchContainerData,
    createContainerMutation,
  }
}


export function useContainers(){
  const {user} = useAuth()
  const supabaseClient = useSupabase()

  const {
    data: containers,
    isFetching: isFetchingContainers,
    error: containersError
  } = useQuery({
    queryKey: ['containers', user?.id],
    queryFn: async ()=>{
      const {data, error} = await supabaseClient  
        .from('containers')
        .select("*")
        .eq('owner_id', user?.id)
      if (error) throw error

      return data as Container[]
    },
    enabled: !!user?.id
  })

  return {
    containers,
    isFetchingContainers,
    containersError
  }
}