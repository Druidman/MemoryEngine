
import { cosineSim } from "./cosineSimilarity";
import { Entity } from "./database/entities";
import { createSupabaseServiceClient } from "./database/supabaseServiceClient";

const CANDIDATE_SIMILARITY_BAR = 0.85

export async function handleEntitiesMerge(entities: Entity[]){
    const {error, count} = await createSupabaseServiceClient()
        .from('entities')
        .select(undefined,{count: 'exact'})
        .eq('status', 'queued_for_merge')
        .in('id', entities.map((entity)=>entity.id))

    if (error) throw error

    if (count != entities.length)
        throw new Error('entities from db and entities provided array lengths don`t match. This means that either some entities don`t exist or don`t have `queued_for_merge` status')


    // now after verifying the data we can move onto actual merging schematics
    // we will first take the data and compare embeddings through each other. (server side compute because why waste db energy)


    const entityMap: Record<string, Entity> = {}

    entities.forEach((entity)=>{
        if (entity.id in entityMap){
            throw new Error('Duplicate id found in entities list in merge handler')
        }
        entityMap[entity.id] = entity
    })

    const similarityMap: {[x in string]: number} = {}
    entities.forEach((entity)=>{
        
        entities.forEach((entity2)=>{
            // check if similarity is already computed using composite keys
            const compositeKey1 = entity.id + entity2.id
            const compositeKey2 = entity2.id + entity.id


            if (
                !(compositeKey1 in similarityMap)
                &&
                !(compositeKey2 in similarityMap)
            ){
                // need compute
                similarityMap[compositeKey1] = cosineSim(entity.embedding, entity2.embedding)
            }

            
        })
    })

    // now we need to pull out possible candidates
    // essentially above 0.85 is a L2 candidate

    const candidates = Object.keys(similarityMap).map((key)=>{
        const similarity = similarityMap[key]

        // slice by half
        const id1 = key.slice(0, key.length)
        const id2 = key.slice(key.length)

        if (similarity > CANDIDATE_SIMILARITY_BAR){
            // we have a candidate !

            const candidate1 = entityMap[id1]
            const candidate2 = entityMap[id2]

            return {
                candidate1,
                candidate2,
                similarity
            }
        }
    })

    // now with candidates in place we don't want to merge them yet (obviously)
    // We will run L2 pass rn which includes llm arbiter which will decide whether found candidate entities should be merged or not really

    console.log(candidates.map((entity)=>entity?.candidate1.canonical_name + " " + entity?.candidate2.canonical_name))




}