import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSupabase } from "./useSupabase"
import z from "zod"
import { getSupabaseAccessTokenHeader } from "../utils/supabase"
export const SessionSchema = z.object({
  id : z.uuid(),
  container_id: z.uuid(),
  created_at: z.string(),
})
export type Session = z.infer<typeof SessionSchema>

export function useSessions(containerId?: string){
  const supabaseClient = useSupabase()

  const {
    data: sessions,
    isFetching: isFetchingSessions,
    error: sessionsError
  } = useQuery({
    queryKey: ['sessions', containerId],
    queryFn: async ()=>{
      const {data, error} = await supabaseClient  
        .from('sessions')
        .select("*")
        .eq('container_id', containerId)
      if (error) throw error

      return data as Session[]
    },
    enabled: !!containerId
  })

  return {
    sessions,
    isFetchingSessions,
    sessionsError
  }
}
export const SessionMessageSchema = z.object({
  id: z.uuid(),
  session_id: z.uuid(),
  payload: z.object({
    role: z.enum(['assistant', 'system', 'user']),
    content: z.string(),
  }),
  created_at: z.string(),
})
export type SessionMessage = z.infer<typeof SessionMessageSchema>

export const SessionDataSchema = z.object({
  messages: z.array(SessionMessageSchema),
})
type SessionData = z.infer<typeof SessionDataSchema>

export function useSession(containerId: string, sessionId?: string){
  const queryClient = useQueryClient()
  const supabaseClient = useSupabase()

  const {
    data: sessionData,
    isFetching: isFetchingSessionData,
    error: sessionDataError,
    refetch: refetchSessionData
  } = useQuery({
    queryKey: ['sessions', containerId, sessionId, 'data'],
    queryFn: async () => {
      const {data, error} = await supabaseClient
        .from('session_data')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle()
        
      
        if (error) throw error

        return {
          messages: data?.messages ?? []
        } as SessionData
      
    },
    staleTime: Infinity, // realtime will refresh
    enabled: !!sessionId && !!containerId
  })


  const createSessionMutation = useMutation({
    mutationFn: async (containerId: string) => {
      
      // call
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/new_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getSupabaseAccessTokenHeader()) },
        body: JSON.stringify({ container_id: containerId }),
      })
      if (!response.ok) throw new Error('Failed to create session')
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['sessions', containerId] })
    },
  })

  const getSessionResponseMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!sessionId) throw new Error('Missing sessionId in a hook')
      // optimistic update on messages
      queryClient.setQueryData(['sessions', containerId, sessionId, 'data'] , (prev: SessionData)=>{
        return {
          messages: [
            ...prev.messages, {
              id: 'OPTIMISTIC', 
              session_id: sessionId, 
              payload: {
                role: 'user',
                content: content
              },
              created_at: new Date().toISOString()
            }

          ]
        }
      })
      // call
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL + `/session/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getSupabaseAccessTokenHeader()) },
        body: JSON.stringify({ message: {
          role: 'user',
          content: content
        } }),
      })
      if (!response.ok && response.status != 400) throw new Error('Failed to get session response')
      if (response.status == 400) throw new Error('Unauthorized.')
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['sessions', containerId, sessionId, 'data'] })
    },
    onError: () => {
      queryClient.setQueryData(['sessions', containerId, sessionId, 'data'] , (prev: SessionData)=>{
        return {
          messages: prev.messages.filter((message)=>message.id != 'OPTIMISTIC')
            
        }
      })
    }
  })

  return {
    sessionData,
    isFetchingSessionData,
    sessionDataError,
    refetchSessionData,
    createSession: createSessionMutation.mutateAsync,
    getSessionResponse: getSessionResponseMutation.mutateAsync
  }
}