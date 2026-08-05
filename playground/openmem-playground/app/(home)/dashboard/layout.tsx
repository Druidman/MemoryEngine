"use client";
import { redirect } from "next/navigation"
import { useAuth } from "../../hooks/useAuth"


export default function Layout({ children }: { children: React.ReactNode }) {

  const { user, isFetchingUser} = useAuth()
  if (!isFetchingUser && !user){
    redirect('/signin')
  }

  return children
}
