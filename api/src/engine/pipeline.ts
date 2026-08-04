import z from "zod";
import { MessageType } from "..";

import { supabaseClient } from "../database/supabaseClient";
import {
  callEntityExtractor,
  EntityExtractorResultSchema,
  EntityExtractorResultType,
  ExtractedEntityRelationSchema,
  ExtractedEntitySchema,
  ExtractedEntityType,
} from "../openrouter/callEntityExtractor";
import { callMemoryExtractor } from "./memories/callMemoryExtractor";
import { logExtractionPipeline } from "./logger/log";
import { extractMemories } from "./memories/extract";
import { insertMemories } from "./memories/insert";
import { extractEntities } from "./entities/extract";
import { insertEntitiesToDatabase, insertRelationsToDatabase } from "./entities/insert";
import { entityResolver } from "./entities/resolver/resolve";
import { MappedExtractedEntityWithMentionsAndEnsuredRefType } from "./entities/resolver/types";

export const EntityExtractorResultWithMemoryIdSchema =
  EntityExtractorResultSchema.extend({
    memory_id: z.uuid(),
  });
export type EntityExtractorResultWithMemoryIdType = z.infer<
  typeof EntityExtractorResultWithMemoryIdSchema
>;

export const ExtractedEntitiesWithMemoryIdSchema = z.object({
  entities: ExtractedEntitySchema.array(),
  memory_id: z.uuid(),
});
export type ExtractedEntitiesWithMemoryIdType = z.infer<
  typeof ExtractedEntitiesWithMemoryIdSchema
>;

export const ExtractedEntityRelationsWithMemoryIdSchema = z.object({
  relations: ExtractedEntityRelationSchema.array(),
  memory_id: z.uuid(),
});
export type ExtractedEntityRelationsWithMemoryIdType = z.infer<
  typeof ExtractedEntityRelationsWithMemoryIdSchema
>;



export async function runExtractionPipeline(
  messages: MessageType[],
  sessionId: string,
  containerId: string,
) {
  logExtractionPipeline("Started");

  if (messages.length == 0) return;

  // EXTRACT MEMORIES
  // First get current session memories
  const extractedMemories = await extractMemories(messages, sessionId)

  // Now insert those memories into db
  const insertedMemories = await insertMemories(extractedMemories, sessionId, containerId)

  // EXTRACT ENTITIES
  const entityExtractionResult = await extractEntities(insertedMemories, containerId)
  
  // Collect extraction results and pass them to `entity resolver`
  const {entities: resolvedEntities, relations: resolvedRelations} = 
    await entityResolver(entityExtractionResult, containerId);


  // Embeed entities
  // await addEmbeddingForEntities()
  
  // Inserter
  logExtractionPipeline('Inserting entities to database...')
  const entitiesWithEnsuredRefs = await insertEntitiesToDatabase(resolvedEntities, containerId)
  logExtractionPipeline('Inserted entities to database.')

  // First ensure that refs are propagated into relations
  const entityLocalIdHashTable: {[x in string]: MappedExtractedEntityWithMentionsAndEnsuredRefType} = {}
  entitiesWithEnsuredRefs.forEach((entity)=>{
    if (entity.local_id in entityLocalIdHashTable){
      logExtractionPipeline("[UNEXPECTED_ERROR] Found two entities with the same local_id: ", entity, entityLocalIdHashTable[entity.local_id])
      throw new Error("Found two entities with the same local_id")
    }
    entityLocalIdHashTable[entity.local_id] = entity
  })

  // We assume that local_id from relations will always be found in entityLocalIdHashTable
  // Map refs to relations
  resolvedRelations.forEach((relation)=>{
    relation.subject_ref_id = entityLocalIdHashTable[relation.local_subject_id].ref_id
    relation.object_ref_id = entityLocalIdHashTable[relation.local_object_id].ref_id
  })
  
  // Now insert relations
  logExtractionPipeline('Inserting relations to database...')
  await insertRelationsToDatabase(resolvedRelations)
  logExtractionPipeline('Inserted relations to database.')
  
}





















