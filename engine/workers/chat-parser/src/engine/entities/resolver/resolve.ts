import { EntityExtractorResultWithMemoryIdType } from "../../pipeline";
import { logExtractionPipeline } from "../../logger/log";
import { checkForDuplicatesInMemoryScope } from "./check";
import { deduplicateEntitiesInExtractionScope, deduplicateRelationsInExtractionScope } from "./dedup";
import { assignExternalRefsToEntities, assignExternalRefToRelations, assignLocalIdsToEntityExtraction } from "./identity";
import { SupabaseClient } from "@supabase/supabase-js";
import { MappedExtractedEntityRelationWithMentionsType } from "./types";



// Dedup & assign refs from external source
export async function entityResolver(
  extractionResult: EntityExtractorResultWithMemoryIdType[],
  containerId: string,
  supabaseClient: SupabaseClient
) {
  // [TODO] We assume that there cannot be an entity with the same name and type in a single memory
  // For that reason first let's check if something like this did happen. If so log it.

  checkForDuplicatesInMemoryScope(extractionResult);

  // Step 0 is assigning unique "local ids" to entities and changing relations from using
  // subject/object: name -> "local id"

  const mappedExtractionData =
    assignLocalIdsToEntityExtraction(extractionResult);

  // Internal Deduplication
  const {deduplicatedEntities, mappedRelationsWithUpdatedIds} = deduplicateEntitiesInExtractionScope(
    mappedExtractionData.entities,
    mappedExtractionData.relations
  );
  logExtractionPipeline('Results of internal entity deduplication. ', deduplicatedEntities)
  const deduplicatedRelations = deduplicateRelationsInExtractionScope(
    mappedRelationsWithUpdatedIds,
  );

  // External Deduplication - assigning referenced entities from database
  const entitiesWithRefs =
    await assignExternalRefsToEntities(deduplicatedEntities, containerId, supabaseClient);

  logExtractionPipeline('Results of direct entity deduplication: ', entitiesWithRefs)
  // Assign external entity ids within relations
  const mappedRelations: MappedExtractedEntityRelationWithMentionsType[] = deduplicatedRelations.map((relation)=>{
    return {
      ...relation,
      subject_ref_id: entitiesWithRefs.find((entity)=>entity.local_id == relation.local_subject_id)?.ref_id,
      object_ref_id: entitiesWithRefs.find((entity)=>entity.local_id == relation.local_object_id)?.ref_id  
    }
  })

  logExtractionPipeline('Starting assigning external refs to relations')
  // Relations deduplication (direct)
  const relationsWithRefs = 
    await assignExternalRefToRelations(mappedRelations, containerId, supabaseClient)
  logExtractionPipeline('Results of direct relation deduplication: ', relationsWithRefs)

  // After chats with hermes I came to a conclusion that "indirect relation deduper" is "nice to have"
  // the other hand "indirect entity deduper" is MUST HAVE xD
  // Indirect will use queue based deduping which is not to be done here. 

  return {
    relations: relationsWithRefs,
    entities: entitiesWithRefs
  }
  

}


