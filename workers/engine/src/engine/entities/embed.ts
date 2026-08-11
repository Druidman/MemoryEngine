import { SupabaseClient } from "@supabase/supabase-js";
import { callEmbedder, EmbeddingEntry } from "../../openrouter/callEmbedder";
import { MappedExtractedEntityWithMentionsAndEnsuredRefType } from "./resolver/types";
import { logExtractionPipeline } from "../logger/log";

export async function addEmbeddingForEntities(entities: MappedExtractedEntityWithMentionsAndEnsuredRefType[], supabaseClient: SupabaseClient) {
  // embedd
  const entitiesToEmbed: (MappedExtractedEntityWithMentionsAndEnsuredRefType & EmbeddingEntry)[] = entities
    .map((entity)=>({
      ...entity,
      textToEmbed: `ENTITY: ${entity.canonical_name}, TYPE: ${entity.type}`
    }))
  console.log(entitiesToEmbed)

  logExtractionPipeline('Calling embedder model...')
  const embeddedEntities = await callEmbedder(entitiesToEmbed)
  logExtractionPipeline('Embedding finished.')

  logExtractionPipeline('Starting updating entities in db...')
  // update
  const {error} = await supabaseClient 
    .rpc('update_entities_embeddings', {p_entities: embeddedEntities.map((entity)=>({
      id: entity.ref_id,
      embedding: entity.embedding,
      embedding_model: entity.embeddingModel
    }))})

  if (error) throw error
  logExtractionPipeline('Updated entity embeddings in db...')

  

  return embeddedEntities
}