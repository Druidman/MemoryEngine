import { useMemo } from "react";
import { createSupabaseClient } from "../utils/supabase";


export function useSupabase(){
  const client = useMemo(()=>{
    return createSupabaseClient() 
  },[])

  return client
}