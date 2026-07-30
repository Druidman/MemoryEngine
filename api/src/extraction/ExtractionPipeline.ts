import { MessageType } from ".."
import { EntityType } from "../database/entities"
import { Memory } from "../database/memories"
import { supabaseClient } from "../database/supabaseClient"
import { callEntityExtractor, ExtractedEntitiesType } from "../models/callEntityExtractor"
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
  const {data: sessionMemories, error} = await supabaseClient
    .from('memories')
    .select("*")
    .eq('session_id', sessionId) // single session
    .overrideTypes<Memory[]>()
  
  if (error) throw error
  logExtractionPipeline("Fetched session memories")

  // Now extract facts, preferences, suggestions 
  const extractedMemories = await callMemoryExtractor(messages, sessionMemories)

  logExtractionPipeline("Extracted memories", extractedMemories)

  // Now insert those memories into db
  const {data: insertedMemories, error: memoriesInsertError} = await supabaseClient
    .from('memories')
    .insert(extractedMemories.memories.map((memory)=>({
      content: memory.content,
      confidence: memory.confidence,
      type: memory.type,
      session_id: sessionId,
      container_id: containerId,
      metadata_hints: memory.supersedes_hint ? {supersedes: memory.supersedes_hint} : undefined
    })))
    .select("*")

  if (memoriesInsertError) throw memoriesInsertError

  logExtractionPipeline("Inserted memories")


  // EXTRACT ENTITIES

  // First get known entities
  const {data: knownEntities, error: knownEntitiesError} = await supabaseClient
    .from('entities')
    .select(`
      canonical_name,
      aliases,
      type
    `)
    .order('updated_at', {ascending: false}) // newest first
    .limit(50) 
    // This way we get top 50(k) most recently used entities

  if (knownEntitiesError) throw knownEntitiesError

  logExtractionPipeline("Fetched known entities", knownEntities)

  // Now for each memory we need to fire extraction
  const entityExtractionResult: (ExtractedEntitiesType & {memory_id: string})[] = await Promise.all(insertedMemories.map(async (memory, i)=>{
    // console.log(memory)
    logExtractionPipeline(`Extracting entities from memory n: ${i + 1}`)
    const singleExtractionResult = await callEntityExtractor(memory, knownEntities)
    logExtractionPipeline(`[ENTITY_EXTRACTOR_${i+1}] Extracted entities: `, singleExtractionResult)
    return {...singleExtractionResult, memory_id: memory.id as string}
  }))

  logExtractionPipeline(`Extracted entities`)

  logExtractionPipeline(`Entities: ${JSON.stringify(entityExtractionResult)}`)
  // Collect extraction results and pass them to `entity resolver`
  await entityResolver(entityExtractionResult)  

}


async function entityResolver(extractionResult: (ExtractedEntitiesType & {memory_id: string})[]){
  // Deduplicate entities
  // L1, L2, L3 process

  // L1:
  // 1. deduplicate in result itself (merge aliases and dedup canonical_names)
  // 2. Check if exists in db.


  // L1 Implementation
  const entityMap: {[x in string]: ExtractedEntitiesType} = {}
  // Upsert entities
}