import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSupabase } from "./useSupabase"
import * as z from 'zod'

export const SignInCredsSchema = z.object({
  email: z.email(),
  password: z.string().min(6)
})
export type SignInCreds = z.infer<typeof SignInCredsSchema>

export function useAuth(){
  const queryClient = useQueryClient()
  const client = useSupabase()

  const {data: user, refetch: refetchUser} = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      return (await client.auth.getUser()).data.user
    },
    staleTime: 60_000
  })

  const signIn = async (creds: SignInCreds)=>{
    // verify creds
    const {email, password} = SignInCredsSchema.parse(creds)
    // signin
    const signInData = await client.auth.signInWithPassword({email, password})
    
    if (signInData.error) throw signInData.error

    // signed in
    queryClient.setQueryData(['user'], signInData.data.user)
  }

  const signUp = async (creds: SignInCreds)=>{
    // verify creds
    const {email, password} = SignInCredsSchema.parse(creds)
    // signup
    const signUpData = await client.auth.signUp({email, password})
    
    if (signUpData.error) throw signUpData.error

    // signed up
    queryClient.setQueryData(['user'], signUpData.data.user)
  }
  
  return {
    user,
    refetchUser,

    signIn,
    signUp
  }
}