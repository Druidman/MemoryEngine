import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useSupabase } from "./useSupabase";
import * as z from 'zod'

export const EntitiesSchema = z.object({

})

export const RelationsSchema = z.object({
  
})

export const MemoriesSchema = z.object({
  
})

export const EntireContainerGraphDataSchema = z.object({
  entities: EntitiesSchema,
  relations: RelationsSchema,
  memories: MemoriesSchema
})
export type EntireContainerGraphData = z.infer<typeof EntireContainerGraphDataSchema>

// !! Currently only one container per user !!
export default function useContainer(){
  const {user} = useAuth()
  const supabaseClient = useSupabase()

  const {
    data: containerData,
    isFetching,
    error
  } = useQuery({
    queryKey: ['container', 'data', user!.id],
    queryFn: async () => {
      const {data, error} = await supabaseClient
        .from('entire_container_graph')
        .select('*')
        .eq('owner_id', user?.id)
        .single()
        // .overrideTypes<EntireContainerGraphData[]>()
      
        if (error) throw error

        return data as EntireContainerGraphData
      
    },
    staleTime: Infinity, // realtime will refresh
    enabled: !!user
  })

  return {
    containerData,
    isFetching,
    error
  }
}