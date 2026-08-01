import z from "zod"
import { MessageType } from ".."
import { Memory } from "../database/memories"
import { supabaseClient } from "../database/supabaseClient"
import { callEntityExtractor, ExtractedEntitiesWithRelationsSchema, ExtractedEntitiesWithRelationsType, ExtractedEntityRelationSchema, ExtractedEntitySchema, ExtractedEntityType } from "../models/callEntityExtractor"
import { callMemoryExtractor } from "../models/callMemoryExtractor"


export const ExtractedEntitiesWithRelationsWithMemoryIdSchema = ExtractedEntitiesWithRelationsSchema.extend({
  memory_id: z.uuid()
})
export type ExtractedEntitiesWithRelationsWithMemoryIdType = z.infer<typeof ExtractedEntitiesWithRelationsWithMemoryIdSchema>

export const ExtractedEntitiesWithMemoryIdSchema = z.object({
  entities: ExtractedEntitySchema.array(),
  memory_id: z.uuid()
})
export type ExtractedEntitiesWithMemoryIdType = z.infer<typeof ExtractedEntitiesWithMemoryIdSchema>

export const ExtractedEntityRelationsWithMemoryIdSchema = z.object({
  relations: ExtractedEntityRelationSchema.array(),
  memory_id: z.uuid()
})
export type ExtractedEntityRelationsWithMemoryIdType = z.infer<typeof ExtractedEntityRelationsWithMemoryIdSchema>

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
  const entityExtractionResult: (ExtractedEntitiesWithRelationsType & {memory_id: string})[] = await Promise.all(insertedMemories.map(async (memory, i)=>{
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

function checkForDuplicatesInMemoryScope(extractionResult: ExtractedEntitiesWithRelationsWithMemoryIdType[]){
  extractionResult.forEach((singleResult)=>{
    const entityMap: Record<string, ExtractedEntityType> = {}
  
    singleResult.entities.forEach((entity)=>{
      const found = Object.keys(entityMap).find((val) => val == entity.canonical_name + entity.type)
      if (found){
        logExtractionPipeline(`[UNEXPECTED_ERROR]: Found the same entities in a single memory. `, entityMap[found], ' and ', entity)
      }
      else {
        entityMap[entity.canonical_name + entity.type] = entity
      }
    })
  })
}

function mergeEntityWithMention(baseEntity: ExtractedEntityWithMentionsType, candidate: ExtractedEntityWithMemoryIdType){
  const mergedEntity = baseEntity
  // merge two results
  // - append new aliases
  // - append new properties
  // - calculate new confidence


  // Append new aliases
  candidate.aliases.forEach((alias)=>{
    if (mergedEntity.aliases.find((val)=>val===alias)){
      return // skip
    }
    mergedEntity.aliases.push(alias)
  })

  // Append new properties
  if (mergedEntity?.properties){

    Object.keys(candidate?.properties ?? {}).forEach((key)=>{
      if (key in mergedEntity.properties!){
        // Confidence check
        if (mergedEntity.confidence < candidate.confidence){
          mergedEntity.properties![key] = candidate.properties![key]
        }
      }
      else {
        mergedEntity.properties![key] = candidate.properties![key]
      }
    })

  } else {
    mergedEntity.properties = candidate.properties
  }

  // Calculate new confidence
  // Formula: 1 - SOP[ 1 - i_c ]
  // Sum of product
  // Xd
  const confidence = 1 - [...baseEntity.mentions, candidate].reduce((total, curr)=>{
    return total * (1 - curr.confidence)
  }, 1)

  mergedEntity.confidence = confidence

  return mergedEntity

}

export const ExtractedEntityWithMemoryIdSchema = ExtractedEntitySchema.extend({memory_id: z.uuid()})
export type ExtractedEntityWithMemoryIdType = z.infer<typeof ExtractedEntityWithMemoryIdSchema>

export const ExtractedEntityWithMentionsSchema = ExtractedEntitySchema.extend({
  mentions: ExtractedEntityWithMemoryIdSchema.omit({type: true, canonical_name: true}).array()
})
export type ExtractedEntityWithMentionsType = z.infer<typeof ExtractedEntityWithMentionsSchema>

export const ExtractedEntityWithMentionsAndRefSchema = ExtractedEntityWithMentionsSchema.extend({
  ref_id: z.uuid().optional() // id of reference entity from database
})
export type ExtractedEntityWithMentionsAndRefType = z.infer<typeof ExtractedEntityWithMentionsAndRefSchema>



function deduplicateEntitiesInExtractionScope(extractedEntities: ExtractedEntitiesWithMemoryIdType[]) : ExtractedEntityWithMentionsType[]{
  // key is canon_name + type
  const entities: {[x in string]: ExtractedEntityWithMentionsType} = {}

  extractedEntities.forEach((entry)=>{
    entry.entities.forEach((entity)=>{
      const idName = entity.canonical_name + entity.type

      if (idName in entities){
        // key exists
        // we need to merge it
        entities[idName] = mergeEntityWithMention(entities[idName], {...entity, memory_id: entry.memory_id})
      }
      else {
        // add new entry
        entities[idName] = {
          ...entity,
          mentions: [{...entity, memory_id: entry.memory_id}]
        }
      }
    })
  })

  return Object.values(entities)
}

function deduplicateRelationsInExtractionScope(extractedRelations: ExtractedEntityRelationsWithMemoryIdType[]){
  // Since these functions are handling direct duplicates we will skip this implementation as it is VERY uncommon to happen
  // What is common to happen is indirect duplicate however we will not be handling that here
  return extractedRelations.flatMap((entry)=>{
    return entry.relations.map((relation)=>({
      ...relation,
      memory_id: entry.memory_id
    }))
  })
}

async function assignExternalRefToEntity(entity: ExtractedEntityWithMentionsType) : Promise<string | null> {
  // call database to find candidate with the same (canonical_name or aliasMatch) and type. 
  // !! THIS IS EXACT REFERENCE FINDER NOT A POSSIBILITY MERGER !!
  const {data, error: error} = await supabaseClient
    .from('entities')
    .select('id')
    .eq('type', entity.type)
    .in('aliases', entity.aliases)
    .or(`canonical_name.eq.${entity.canonical_name}`)
    .maybeSingle()
  if (error){
    logExtractionPipeline('Error in `assignExternalRefToEntity` when fetching data from database')
    throw error
  }
  
  return data?.id
}

async function assignExternalRefsToEntities(entities: ExtractedEntityWithMentionsType[]) : Promise<ExtractedEntityWithMentionsAndRefType[]>{
  return await Promise.all(
    entities.map(async (entity)=>{
      const externalRef = await assignExternalRefToEntity(entity)
      return { ...entity, ...(externalRef ? {ref_id: externalRef} : null) }
    })
  )
}

async function entityResolver(extractionResult: ExtractedEntitiesWithRelationsWithMemoryIdType[]){ 
  // [TODO] We assume that there cannot be an entity with the same name and type in a single memory
  // For that reason first let's check if something like this did happen. If so log it.

  
  checkForDuplicatesInMemoryScope(extractionResult)

  const extractedRelations = extractionResult.map((res)=>({
    relations: res.relations,
    memory_id: res.memory_id
  }))
  const extractedEntities: ExtractedEntitiesWithMemoryIdType[] = extractionResult.map((res)=>({
    entities: res.entities,
    memory_id: res.memory_id
  }))

  // Internal Deduplication
  const deduplicatedExtractedEntities  = deduplicateEntitiesInExtractionScope(extractedEntities)
  const deduplicatedExtractedRelations = deduplicateRelationsInExtractionScope(extractedRelations)

  // External Deduplication - assigning referenced entities from database 
  const fullyDeduplicatedEntities = await assignExternalRefsToEntities(deduplicatedExtractedEntities)
  // Merger 

  // Inserter
  
}