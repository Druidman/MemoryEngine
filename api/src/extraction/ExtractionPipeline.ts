import { MessageType } from ".."
import { Memory } from "../database/memories"
import { supabaseClient } from "../database/supabaseClient"
import { callEntityExtractor } from "../models/callEntityExtractor"
import { callMemoryExtractor } from "../models/callMemoryExtractor"

function logExtractionPipeline(...messages: any[]){
  console.log(`[EXTRACTION_PIPELINE]: `, ...messages)

}

export async function runExtractionPipeline(
  messages: MessageType[],
  sessionId: string,
  containerId: string
){
  logExtractionPipeline("Started")

  if (messages.length == 0) return

  // EXTRACT MEMORIES
  // First get current session memories
  const {data: memories, error} = await supabaseClient
    .from('memories')
    .select("*")
    .eq('session_id', sessionId) // single session
  
  if (error) throw error
  logExtractionPipeline("Fetched session memories")

  // Now extract facts, preferences, suggestions 
  const extractedMemories = await callMemoryExtractor(messages, memories as Memory[])

  logExtractionPipeline("Extracted memories", extractedMemories)

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

  logExtractionPipeline("Inserted memories")

  const updatedExtractedMemories = extractedMemories.memories.map((memory)=>{
    return {...memory, created_at: new Date().toISOString()}
  })


  // EXTRACT ENTITIES

  // First get known entities
  const {data: entities, error: entitiesError} = await supabaseClient
    .from('entities')
    .select(`
      canonical_name,
      aliases,
      type
    `)
    .order('updated_at', {ascending: false}) // newest first
    .limit(50) 
    // This way we get top 50(k) most recently used entities

  if (entitiesError) throw entitiesError

  logExtractionPipeline("Fetched known entities", entities)

  // Now for each memory we need to fire extraction
  const result = await Promise.all(updatedExtractedMemories.map(async (memory, i)=>{
    // console.log(memory)
    logExtractionPipeline(`Extracting entities from memory n: ${i + 1}`)
    const result = await callEntityExtractor(memory, entities)
    logExtractionPipeline(`[ENTITY_EXTRACTOR_${i+1}] Extracted entities: `, result)

  }))

  logExtractionPipeline(`Extracted entities`)

  logExtractionPipeline(`Entities: ${JSON.stringify(result)}`)

  // console.log(result)


  // Collect extraction results and pass them to `entity resolver`
  // ...

  // Insert entities to database


  

}