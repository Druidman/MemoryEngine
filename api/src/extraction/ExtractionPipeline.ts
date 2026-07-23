import { MessageType } from ".."
import { Memory } from "../database/memories"
import { supabaseClient } from "../database/supabaseClient"
import { callMemoryExtractor } from "../models/callMemoryExtractor"


export async function runExtractionPipeline(
  messages: MessageType[],
  sessionId: string,
  containerId: string
){
  console.log('Extraction started...')

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

  console.log(extractedMemories)

  // Now insert those memories into db
  const {error: memoriesInsertError} = await supabaseClient
    .from('memories')
    .insert(extractedMemories.memories.map((memory)=>({
      content: memory.content,
      confidence: memory.confidence,
      type: memory.type,
      session_id: sessionId,
      container_id: containerId,
      metadata_hints: memory.supersedes_hint ? {supersedes: memory.supersedes_hint} : undefined
    })))
  if (memoriesInsertError) throw memoriesInsertError
  
  

}