import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "./useAuth"
import { useSupabase } from "./useSupabase"
import * as z from 'zod'

export const AdminRequestSchema = z.object({
  id: z.uuid(),
  message: z.string(),
  user_id: z.uuid(),
  requested_at: z.string()
})
export type AdminRequest = z.infer<typeof AdminRequestSchema>

export function useAdminRequest(){
  const {user} = useAuth()
  const queryClient = useQueryClient()
  const supabaseClient = useSupabase()

  const {
    data: adminRequests,
    isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin_requests', user?.id],
    queryFn: async ()=>{
      const {data, error} = await supabaseClient  
        .from('admin_requests')
        .select('*')
        .eq('user_id', user!.id!)

      if (error) throw error

      return data as AdminRequest[]
    },
    enabled: !!user?.id,
    staleTime: 60_000
  })

  const placeAdminRequestMutation = useMutation({
    mutationFn: async (message: string)=>{
      const {error} = await supabaseClient  
        .from('admin_requests')
        .insert({
          message: message
        })

      if (error) throw error
    },
    onSuccess: async ()=>{
      await refetch()
    }
  })

  return {
    placeAdminRequest: placeAdminRequestMutation.mutateAsync,
    adminRequests,
    isFetching,
    refetch,
    error
  }
}