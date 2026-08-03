import z from "zod";
import { MessageType } from "..";
import { Memory } from "../database/memories";
import { supabaseClient } from "../database/supabaseClient";
import {
  callEntityExtractor,
  EntityExtractorResultSchema,
  EntityExtractorResultType,
  ExtractedEntityRelationSchema,
  ExtractedEntitySchema,
  ExtractedEntityType,
} from "../models/callEntityExtractor";
import { callMemoryExtractor } from "../models/callMemoryExtractor";

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

function logExtractionPipeline(...messages: any[]) {
  console.log(`[EXTRACTION_PIPELINE]: `, ...messages);
}

export async function runExtractionPipeline(
  messages: MessageType[],
  sessionId: string,
  containerId: string,
) {
  logExtractionPipeline("Started");

  if (messages.length == 0) return;

  // EXTRACT MEMORIES
  // First get current session memories
  const { data: sessionMemories, error } = await supabaseClient
    .from("memories")
    .select("*")
    .eq("session_id", sessionId) // single session
    .overrideTypes<Memory[]>();

  if (error) throw error;
  logExtractionPipeline("Fetched session memories");

  // Now extract facts, preferences, suggestions
  const extractedMemories = await callMemoryExtractor(
    messages,
    sessionMemories,
  );

  logExtractionPipeline("Extracted memories", extractedMemories);

  // Now insert those memories into db
  const { data: insertedMemories, error: memoriesInsertError } =
    await supabaseClient
      .from("memories")
      .insert(
        extractedMemories.memories.map((memory) => ({
          content: memory.content,
          confidence: memory.confidence,
          type: memory.type,
          session_id: sessionId,
          container_id: containerId,
          metadata_hints: memory.supersedes_hint
            ? { supersedes: memory.supersedes_hint }
            : undefined,
        })),
      )
      .select("*");

  if (memoriesInsertError) throw memoriesInsertError;

  logExtractionPipeline("Inserted memories");

  // EXTRACT ENTITIES

  // First get known entities
  const { data: knownEntities, error: knownEntitiesError } =
    await supabaseClient
      .from("entities")
      .select(
        `
      canonical_name,
      aliases,
      type
    `,
      )
      .order("updated_at", { ascending: false }) // newest first
      .limit(50);
  // This way we get top 50(k) most recently used entities

  if (knownEntitiesError) throw knownEntitiesError;

  logExtractionPipeline("Fetched known entities", knownEntities);

  // Now for each memory we need to fire extraction
  const entityExtractionResult: (EntityExtractorResultType & {
    memory_id: string;
  })[] = await Promise.all(
    insertedMemories.map(async (memory, i) => {
      // console.log(memory)
      logExtractionPipeline(`Extracting entities from memory n: ${i + 1}`);
      const singleExtractionResult = await callEntityExtractor(
        memory,
        knownEntities,
      );
      logExtractionPipeline(
        `[ENTITY_EXTRACTOR_${i + 1}] Extracted entities: `,
        singleExtractionResult,
      );
      return { ...singleExtractionResult, memory_id: memory.id as string };
    }),
  );

  logExtractionPipeline(`Extracted entities`);

  logExtractionPipeline(`Entities: ${JSON.stringify(entityExtractionResult)}`);
  // Collect extraction results and pass them to `entity resolver`
  const {entities: resolvedEntities, relations: resolvedRelations} = 
    await entityResolver(entityExtractionResult, containerId);


  // Embeed entities
  // await addEmbeddingForEntities()
  
  // Inserter
  logExtractionPipeline('Inserting entities to database...')
  const entitiesWithEnsuredRefs = await insertEntitiesToDatabase(resolvedEntities, containerId)
  logExtractionPipeline('Inserted entities to database.')

  // Now insert relations
  // await insertEntityRelationsToDatabase(entitiesWithRefs, containerId)
  
}

function checkForDuplicatesInMemoryScope(
  extractionResult: EntityExtractorResultWithMemoryIdType[],
) {
  extractionResult.forEach((singleResult) => {
    const entityMap: Record<string, ExtractedEntityType> = {};

    singleResult.entities.forEach((entity) => {
      const found = Object.keys(entityMap).find(
        (val) => val == entity.canonical_name + entity.type,
      );
      if (found) {
        logExtractionPipeline(
          `[UNEXPECTED_ERROR]: Found the same entities in a single memory. `,
          entityMap[found],
          " and ",
          entity,
        );
      } else {
        entityMap[entity.canonical_name + entity.type] = entity;
      }
    });
  });
}

function mergeEntityWithMention(
  baseEntity: MappedExtractedEntityWithMentionsType,
  candidate: MappedExtractedEntityType,
) {
  const mergedEntity = baseEntity;
  // merge two results
  // - append new aliases
  // - append new properties
  // - calculate new confidence

  // Append new aliases
  candidate.aliases.forEach((alias) => {
    if (mergedEntity.aliases.find((val) => val === alias)) {
      return; // skip
    }
    mergedEntity.aliases.push(alias);
  });

  // Append new properties
  if (mergedEntity?.properties) {
    Object.keys(candidate?.properties ?? {}).forEach((key) => {
      if (key in mergedEntity.properties!) {
        // Confidence check
        if (mergedEntity.confidence < candidate.confidence) {
          mergedEntity.properties![key] = candidate.properties![key];
        }
      } else {
        mergedEntity.properties![key] = candidate.properties![key];
      }
    });
  } else {
    mergedEntity.properties = candidate.properties;
  }

  // Calculate new confidence
  // Formula: 1 - SOP[ 1 - i_c ]
  // Sum of product
  // Xd
  const confidence =
    1 -
    [...baseEntity.mentions, candidate].reduce((total, curr) => {
      return total * (1 - curr.confidence);
    }, 1);

  mergedEntity.confidence = confidence;

  return mergedEntity;
}

export const ExtractedEntityWithMemoryIdSchema = ExtractedEntitySchema.extend({
  memory_id: z.uuid(),
});
export type ExtractedEntityWithMemoryIdType = z.infer<
  typeof ExtractedEntityWithMemoryIdSchema
>;

export const ExtractedEntityRelationWithMemoryIdSchema =
  ExtractedEntityRelationSchema.extend({
    memory_id: z.uuid(),
  });
export type ExtractedEntityRelationWithMemoryIdType = z.infer<
  typeof ExtractedEntityRelationWithMemoryIdSchema
>;

export const MappedExtractedEntitySchema =
  ExtractedEntityWithMemoryIdSchema.extend({
    local_id: z.uuid(),
  });
export type MappedExtractedEntityType = z.infer<
  typeof MappedExtractedEntitySchema
>;

export const MappedExtractedEntityRelationSchema =
  ExtractedEntityRelationWithMemoryIdSchema.extend({
    local_id: z.uuid(),
  })
    .omit({
      object: true,
      subject: true,
    })
    .extend({
      local_subject_id: z.uuid(),
      local_object_id: z.uuid(),
    });
export type MappedExtractedEntityRelationType = z.infer<
  typeof MappedExtractedEntityRelationSchema
>;

export const MappedMemoryEntitiesWithRelationsSchema = z.object({
  entities: MappedExtractedEntitySchema.array(),
  relations: MappedExtractedEntityRelationSchema.array(),
});
export type MappedMemoryEntitiesWithRelationsType = z.infer<
  typeof MappedMemoryEntitiesWithRelationsSchema
>;

export const MappedExtractedEntityMentionSchema = MappedExtractedEntitySchema.omit({
  type: true,
  canonical_name: true,
})
export type MappedExtractedEntityMentionType = z.infer<typeof MappedExtractedEntityMentionSchema>

export const MappedExtractedEntityWithMentionsSchema =
  MappedExtractedEntitySchema.extend({
    mentions: MappedExtractedEntityMentionSchema.array(),
  });
export type MappedExtractedEntityWithMentionsType = z.infer<
  typeof MappedExtractedEntityWithMentionsSchema
>;

export const MappedExtractedEntityWithMentionsAndRefSchema =
  MappedExtractedEntityWithMentionsSchema.extend({
    ref_id: z.uuid().optional(), // id of reference entity from database
  });
export type MappedExtractedEntityWithMentionsAndRefType = z.infer<
  typeof MappedExtractedEntityWithMentionsAndRefSchema
>;

export const MappedExtractedEntityRelationWithMentionsSchema =
  MappedExtractedEntityRelationSchema.extend({
    mentions: MappedExtractedEntityRelationSchema.omit({
      local_subject_id: true,
      local_object_id: true,
      relation: true
    }).array(),
  });
export type MappedExtractedEntityRelationWithMentionsType = z.infer<
  typeof MappedExtractedEntityRelationWithMentionsSchema
>;

export const MappedExtractedEntityRelationWithMentionsAndExternalIdsSchema = 
  MappedExtractedEntityRelationWithMentionsSchema.extend({
    subject_ref_id: z.uuid().optional(),
    object_ref_id: z.uuid().optional()
  })
export type MappedExtractedEntityRelationWithMentionsAndExternalIdsType = z.infer<
  typeof MappedExtractedEntityRelationWithMentionsAndExternalIdsSchema
>;

export const MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefSchema =
  MappedExtractedEntityRelationWithMentionsAndExternalIdsSchema.extend({
    ref_id: z.uuid().optional(), // id of reference relation from database
  });
export type MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefType = z.infer<
  typeof MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefSchema
>;

export const MappedExtractedEntityWithMentionsAndEnsuredRefSchema = MappedExtractedEntityWithMentionsAndRefSchema
  .omit({
    ref_id: true
  }).extend({
    ref_id: z.uuid() // non optional
  })

export type MappedExtractedEntityWithMentionsAndEnsuredRefType = z.infer<
  typeof MappedExtractedEntityWithMentionsAndEnsuredRefSchema
>;

function deduplicateEntitiesInExtractionScope(
  mappedExtractedEntities: MappedExtractedEntityType[],
): MappedExtractedEntityWithMentionsType[] {
  // key is canon_name + type
  const entities: { [x in string]: MappedExtractedEntityWithMentionsType } = {};

  mappedExtractedEntities.forEach((entity) => {
    const idName = entity.canonical_name + entity.type;

    if (idName in entities) {
      // key exists
      // we need to merge it
      entities[idName] = mergeEntityWithMention(entities[idName], entity);
    } else {
      // add new entry
      const {canonical_name, type, ...mention} = entity
      entities[idName] = {
        ...entity,
        mentions: [mention],
      };
    }
  });

  return Object.values(entities);
}

function deduplicateRelationsInExtractionScope(
  extractedRelations: MappedExtractedEntityRelationType[],
) : MappedExtractedEntityRelationWithMentionsType[] {
  // Since these functions are handling direct duplicates we will skip this implementation as it is VERY uncommon to happen
  // What is common to happen is indirect duplicate however we will not be handling that here
  return extractedRelations.flatMap((relation) => ({
    ...relation,
    memory_id: relation.memory_id,
    mentions: []
  }));
}

async function assignExternalRefToEntity(
  entity: MappedExtractedEntityWithMentionsType,
  containerId: string
): Promise<string | null> {
  // call database to find candidate with the same (canonical_name or aliasMatch) and type.
  // !! THIS IS EXACT REFERENCE FINDER NOT A POSSIBILITY MERGER !!
  const { data, error: error } = await supabaseClient.rpc(
    'get_matching_id_for_entity', 
    {
      p_entity_type: entity.type,
      p_entity_aliases: entity.aliases,
      p_entity_canonical_name: entity.canonical_name,
      p_container_id: containerId
    }
  )
  if (error) {
    logExtractionPipeline(
      "Error in `assignExternalRefToEntity` when fetching data from database",
    );
    throw error;
  }

  return data;
}

async function assignExternalRefsToEntities(
  entities: MappedExtractedEntityWithMentionsType[],
  containerId: string
): Promise<MappedExtractedEntityWithMentionsAndRefType[]> {
  return await Promise.all(
    entities.map(async (entity) => {
      const externalRef = await assignExternalRefToEntity(entity, containerId);
      return { ...entity, ...(externalRef ? { ref_id: externalRef } : null) };
    }),
  );
}

async function assignExternalRefToRelation(
  relation: MappedExtractedEntityRelationWithMentionsAndExternalIdsType,
  containerId: string
) : Promise<string | null> {

  if (!relation.subject_ref_id || !relation.object_ref_id){
    return null
  }

  const { data, error: error } = await supabaseClient.rpc(
    'get_matching_id_for_relation', 
    {
      p_relation_relation: relation.relation,
      p_relation_subject_id: relation.subject_ref_id,
      p_relation_object_id: relation.object_ref_id,
      p_container_id: containerId
    }
  )
  if (error) {
    logExtractionPipeline(
      "Error in `assignExternalRefToRelation` when fetching data from database",
    );
    throw error;
  }

  return data?.id;
}

async function assignExternalRefToRelations(
  relations: MappedExtractedEntityRelationWithMentionsAndExternalIdsType[],
  containerId: string
) : Promise<MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefType[]>{
  return await Promise.all(relations.map(async (relation)=>{
    const externalRef = await assignExternalRefToRelation(relation, containerId);
    return { ...relation, ...(externalRef ? { ref_id: externalRef } : null) }
  }))
}

function assignLocalIdsToEntityExtraction(
  extractionResult: EntityExtractorResultWithMemoryIdType[],
): MappedMemoryEntitiesWithRelationsType {

  const USER_ENTITY: ExtractedEntityType = {
    type: "USER",
    canonical_name: "user",
    confidence: 1,
    aliases: []
  }
  
  const mappedData = extractionResult.map((memoryExtraction) => {
    const mappedEntities: MappedExtractedEntityType[] =
      [...memoryExtraction.entities, USER_ENTITY].flatMap((entity) => {
        return [
          {
            ...entity,
            local_id: crypto.randomUUID(),
            memory_id: memoryExtraction.memory_id,
          },
        ];
      });
    const mappedRelations: MappedExtractedEntityRelationType[] =
      memoryExtraction.relations.map((relation) => {
        const { subject, object, ...rest } = relation;
        const foundSubject = mappedEntities.find(
          (entity) =>
            entity.canonical_name == subject.canonical_name &&
            entity.type == subject.type,
        );
        const foundObject = mappedEntities.find(
          (entity) =>
            entity.canonical_name == object.canonical_name &&
            entity.type == object.type,
        );

        if (
          !foundSubject || !foundObject
        ){
          const message = `[assignLocalIdsToEntityExtraction]: ${
            !foundSubject && !foundObject
              ? "Subject and Object"
              : !foundSubject
                ? "Subject"
                : "Object"
          } not found in mappedEntities array. S/O`;
          logExtractionPipeline(message, subject, object);
          throw new Error(message);
        }

        return {
          ...rest,
          local_id: crypto.randomUUID(),
          local_subject_id: foundSubject.local_id,
          local_object_id: foundObject.local_id,
          memory_id: memoryExtraction.memory_id,
        };
      });
    return { entities: mappedEntities, relations: mappedRelations };
  });

  return {
    entities: mappedData.flatMap((entry) => entry.entities),
    relations: mappedData.flatMap((entry) => entry.relations),
  };
}

function mapEntityExternalIdsToRelations(
  relations: MappedExtractedEntityRelationWithMentionsType[],
  entities: MappedExtractedEntityWithMentionsAndRefType[]
) : MappedExtractedEntityRelationWithMentionsAndExternalIdsType[] {
  return relations.map((relation)=>{
    return {
      ...relation,
      subject_ref_id: entities.find((entity)=>entity.local_id == relation.local_subject_id)?.ref_id,
      object_ref_id: entities.find((entity)=>entity.local_id == relation.local_object_id)?.ref_id  
    }
  })
}

async function entityResolver(
  extractionResult: EntityExtractorResultWithMemoryIdType[],
  containerId: string
) {
  // [TODO] We assume that there cannot be an entity with the same name and type in a single memory
  // For that reason first let's check if something like this did happen. If so log it.

  checkForDuplicatesInMemoryScope(extractionResult);

  // Step 0 is assigning unique "local ids" to entities and changing relations from using
  // subject/object: name -> "local id"

  const mappedExtractionData =
    assignLocalIdsToEntityExtraction(extractionResult);

  // Internal Deduplication
  const deduplicatedEntities = deduplicateEntitiesInExtractionScope(
    mappedExtractionData.entities,
  );
  const deduplicatedRelations = deduplicateRelationsInExtractionScope(
    mappedExtractionData.relations,
  );

  // Merger
  logExtractionPipeline('Starting assigning external refs to entities')
  // External Deduplication - assigning referenced entities from database
  const entitiesWithRefs =
    await assignExternalRefsToEntities(deduplicatedEntities, containerId);

  logExtractionPipeline('Results of direct entity deduplication: ', entitiesWithRefs)
  // Assign external entity ids within relations
  const mappedRelations = mapEntityExternalIdsToRelations(deduplicatedRelations, entitiesWithRefs)

  logExtractionPipeline('Starting assigning external refs to relations')
  // Relations deduplication (direct)
  const relationsWithRefs = 
    await assignExternalRefToRelations(mappedRelations, containerId)
  logExtractionPipeline('Results of direct relation deduplication: ', relationsWithRefs)

  // After chats with hermes I came to a conclusion that "indirect relation deduper" is "nice to have"
  // the other hand "indirect entity deduper" is MUST HAVE xD
  // Indirect will use queue based deduping which is not to be done here. 

  return {
    relations: relationsWithRefs,
    entities: entitiesWithRefs
  }
  

}



async function insertEntitiesToDatabase(
  entities: MappedExtractedEntityWithMentionsAndRefType[], 
  containerId: string
) : Promise<MappedExtractedEntityWithMentionsAndEnsuredRefType[]> {
  // if ref id is present this means that entity itself will be inserted as a mention to already existing object
  const readyToInsertEntity = (entity: MappedExtractedEntityWithMentionsAndRefType) => {
    const {mentions, local_id, ref_id, memory_id, ...rest} = entity
    return {
      ...rest,
      container_id: containerId
    }
  }
  const readyToInsertEntityMention = (entityMention: MappedExtractedEntityMentionType, entity_id: string) => {
    const {local_id, ...rest} = entityMention
    return {
      ...rest,
      entity_id: entity_id
    }
  }

  const entitiesWithoutRefs = entities.filter((entity)=>!entity.ref_id)
  const entitiesWithRefs = entities.filter((entity)=>entity.ref_id)


  // insert entitiesWithoutRefs
  logExtractionPipeline('Inserting entities without refs(new) to database...')
  const {data: newEntityIds, error: newEntityInsertError} = await supabaseClient
      .from('entities')
      .insert(entitiesWithoutRefs.map((entity)=>readyToInsertEntity(entity)))
      .select('id')

  if (newEntityInsertError){
    logExtractionPipeline('Error when inserting new entities into db.', newEntityInsertError)
    throw newEntityInsertError
  }
  // map ids to entitiesWithoutRefs mentions
  entitiesWithoutRefs.forEach((_element, index, arr)=>{
    arr[index].ref_id = newEntityIds[index].id
  })

  // insert ALL mentions at once. 
  logExtractionPipeline('Inserting entity mentions to database...')
  const {error: entityMentionsInsertError} = await supabaseClient
    .from('entity_mentions')
    .insert([...entitiesWithRefs, ...entitiesWithoutRefs].flatMap((entity)=>{
      // use ! here as ref_ids are ensured in entitiesWithRefs and previously mapped to entitiesWithoutRefs
      
      return entity.mentions.map((mention)=>{
        console.log(mention)
        return readyToInsertEntityMention(mention, entity.ref_id!)
      })
    }))
    .select('id')

  if (entityMentionsInsertError){
    logExtractionPipeline('Error when inserting new mentions into db.', entityMentionsInsertError)
    throw entityMentionsInsertError
  }

  // We don't care about mention ids as they are useless.
  // However we do care about inserting relations which require entity id.
  // After mapping in previous steps we can return merge of those arrays and these would ensure that ref_id is present
  return [...entitiesWithRefs, ...entitiesWithoutRefs] as MappedExtractedEntityWithMentionsAndEnsuredRefType[]


}

