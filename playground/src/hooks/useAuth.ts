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

  

  const {data: user, refetch: refetchUser, isFetching: isFetchingUser} = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      return (await client.auth.getUser()).data.user
    },
    staleTime: 60_000
  })

  const {data: adminUsers} = useQuery({
    queryKey: ['admins'],
    queryFn: async ()=>{
      const {data} = await client
        .from('admin_users')
        .select('user_id')
    
      return data ?? []
    },
    staleTime: 15_000
  })
  
  const anonymousSignIn = async () => {
    const signInData = await client.auth.signInAnonymously()

    if (signInData.error) throw signInData.error

    queryClient.setQueryData(['user'], signInData.data.user)
  }

  const isSessionPresent = async () => {
    return (await client.auth.getSession()).data.session ? true : false
  }

  const signOut = async () => {
    await client.auth.signOut()
    await refetchUser()
  }

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
  
  const isAdmin = !!(adminUsers?.find((user)=>user.user_id == user?.user_id))
  return {
    user,
    isAdmin,
    isFetchingUser,
    refetchUser,

    signIn,
    signUp,

    signOut,

    anonymousSignIn,
    isSessionPresent
  }
}