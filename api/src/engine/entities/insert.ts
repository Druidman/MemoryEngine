import { supabaseClient } from "../../database/supabaseClient"
import { MappedExtractedEntityMentionType, MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefType, MappedExtractedEntityWithMentionsAndEnsuredRefSchema, MappedExtractedEntityWithMentionsAndEnsuredRefType, MappedExtractedEntityWithMentionsAndRefType } from "./resolver/types"
import { logExtractionPipeline } from "../logger/log"

export async function insertEntitiesToDatabase(
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
  return [...entitiesWithRefs, ...entitiesWithoutRefs] as MappedExtractedEntityWithMentionsAndEnsuredRefType[]


}


export async function insertRelationsToDatabase(
  relations: MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefType[],
  entities: MappedExtractedEntityWithMentionsAndEnsuredRefType[],
  containerId: string
){
  
}