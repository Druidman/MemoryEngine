import { MappedExtractedEntityMentionType, MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefType, MappedExtractedEntityWithMentionsAndEnsuredRefSchema, MappedExtractedEntityWithMentionsAndEnsuredRefType, MappedExtractedEntityWithMentionsAndRefType } from "./resolver/types"
import { logExtractionPipeline } from "../logger/log"
import { SupabaseClient } from "@supabase/supabase-js"

export async function insertEntitiesToDatabase(
  entities: MappedExtractedEntityWithMentionsAndRefType[], 
  containerId: string, 
  supabaseClient: SupabaseClient
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
  entitiesWithoutRefs.forEach((element, index)=>{
    element.ref_id = newEntityIds[index].id
  })

  // insert ALL mentions at once. 
  logExtractionPipeline('Inserting entity mentions to database...')
  const {error: entityMentionsInsertError} = await supabaseClient
    .from('entity_mentions')
    .insert([...entitiesWithRefs, ...entitiesWithoutRefs].flatMap((entity: MappedExtractedEntityWithMentionsAndRefType)=>{
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

  // check
  // [...entitiesWithRefs, ...entitiesWithoutRefs].forEach((entity)=>{
  //   if (!entity.ref_id) {
  //     console.log('NO REF FOR')
  //     console.log(entity)
  //   }
  // })
  return [...entitiesWithRefs, ...entitiesWithoutRefs] as MappedExtractedEntityWithMentionsAndEnsuredRefType[]


}


export async function insertRelationsToDatabase(
  relations: MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefType[],
  containerId: string, 
  supabaseClient: SupabaseClient
){

  

  const relationsWithoutRef = relations.filter((relation)=>!relation.ref_id)
  const relationsWithRef = relations.filter((relation)=>relation.ref_id)
  // Insert relations
  const {data: relationsWithoutRef_Ids, error: relationInsertError} = await supabaseClient
    .from('relations')
    .insert(relationsWithoutRef.map((relation)=>{
      const {
        local_id,
        local_object_id,
        local_subject_id,
        mentions,
        subject_ref_id,
        object_ref_id,
        ref_id,
        ...formated
      } = relation
      return {
        ...formated,
        container_id: containerId,
        subject_id: subject_ref_id,
        object_id: object_ref_id
      }
    }))
    .select('id')
  
  if (relationInsertError) throw relationInsertError

  // Map ids 
  relationsWithoutRef.forEach((relation, ind)=>{
    relation.ref_id = relationsWithoutRef_Ids[ind].id
  })

  // Insert Mentions (relationsWithRef mentions and without ref mentions)
  const {error: relationMentionsInsertError} = await supabaseClient
    .from('relation_mentions')
    .insert([...relationsWithoutRef, ...relationsWithRef].flatMap((relation)=>{
      return relation.mentions.map((mention)=>{
        const {
          local_id,
          ...formated
        } = mention
        return formated
      })
    }))
  
  if (relationMentionsInsertError) throw relationMentionsInsertError
}