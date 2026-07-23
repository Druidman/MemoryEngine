import { MessageType } from ".."
import { Memory } from "../database/memories"
import { supabaseClient } from "../database/supabaseClient"
import { callMemoryExtractor } from "../models/callMemoryExtractor"


export async function runExtractionPipeline(
  messages: MessageType[],
  sessionId: string
){
  console.log('Extraction started started...')

  if (messages.length == 0) return

  // EXTRACT MEMORIES
  // First get current session memories
  const {data: memories, error} = await supabaseClient
    .from('memories')
    .select("*")
    .eq('session_id', sessionId)
  
  if (error) throw error
  // Now extract facts, preferences, suggestions 
  const extractedMemories = await callMemoryExtractor(messages, memories as Memory[])
  
  

}