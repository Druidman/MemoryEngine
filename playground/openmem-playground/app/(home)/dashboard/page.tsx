"use client";

import { useAuth } from "@/app/hooks/useAuth"

export default function Dashboard(){
  const {signOut} = useAuth()
  const handleSignOut = async () =>{
    await signOut()
  }

  return <div>
    <h1>DASHBOARD</h1>
    <button onClick={handleSignOut}>Sign out</button>
  </div>
}