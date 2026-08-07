
import { ExtractedEntityType } from "../../../openrouter/callEntityExtractor";
import { MappedExtractedEntityRelationType, MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefType, MappedExtractedEntityRelationWithMentionsAndExternalIdsType, MappedExtractedEntityType, MappedExtractedEntityWithMentionsAndRefType, MappedExtractedEntityWithMentionsType, MappedMemoryEntitiesWithRelationsType } from "./types";
import {EntityExtractorResultWithMemoryIdType} from '../../pipeline'
import { logExtractionPipeline } from "../../logger/log";
import { SupabaseClient } from "@supabase/supabase-js";

const USER_ENTITY: ExtractedEntityType = {
  type: "USER",
  canonical_name: "user",
  confidence: 1,
  aliases: []
}

// LOCAL
export function assignLocalIdsToEntityExtraction(
  extractionResult: EntityExtractorResultWithMemoryIdType[],
): MappedMemoryEntitiesWithRelationsType {

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
          logExtractionPipeline(message, subject, object, foundSubject, foundObject);
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

// EXTERNAL
export async function assignExternalRefsToEntities(
  entities: MappedExtractedEntityWithMentionsType[],
  containerId: string,
  supabaseClient: SupabaseClient
): Promise<MappedExtractedEntityWithMentionsAndRefType[]> {
  return await Promise.all(
    entities.map(async (entity) => {
      const externalRef = await assignExternalRefToEntity(entity, containerId, supabaseClient);
      return { ...entity, ...(externalRef ? { ref_id: externalRef } : null) };
    }),
  );
}
export async function assignExternalRefToRelations(
  relations: MappedExtractedEntityRelationWithMentionsAndExternalIdsType[],
  containerId: string,
  supabaseClient: SupabaseClient
) : Promise<MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefType[]>{
  return await Promise.all(relations.map(async (relation)=>{
    const externalRef = await assignExternalRefToRelation(relation, containerId, supabaseClient);
    return { ...relation, ...(externalRef ? { ref_id: externalRef } : null) }
  }))
}


async function assignExternalRefToRelation(
  relation: MappedExtractedEntityRelationWithMentionsAndExternalIdsType,
  containerId: string,
  supabaseClient: SupabaseClient
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
async function assignExternalRefToEntity(
  entity: MappedExtractedEntityWithMentionsType,
  containerId: string,
  supabaseClient: SupabaseClient
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