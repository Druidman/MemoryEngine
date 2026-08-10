import { SupabaseClient } from "@supabase/supabase-js";
import { callEmbedder, EmbeddingEntry } from "../../openrouter/callEmbedder";
import { MappedExtractedEntityWithMentionsAndEnsuredRefType } from "./resolver/types";
import { logExtractionPipeline } from "../logger/log";

export async function addEmbeddingForEntities(entities: MappedExtractedEntityWithMentionsAndEnsuredRefType[], supabaseClient: SupabaseClient) {
  // embedd
  const entitiesToEmbed: (MappedExtractedEntityWithMentionsAndEnsuredRefType & EmbeddingEntry)[] = entities
    .map((entity)=>({
      ...entity,
      textToEmbed: `${entity.canonical_name}[${entity.type}]`
    }))

  logExtractionPipeline('Calling embedder model...')
  const embeddedEntities = await callEmbedder(entitiesToEmbed)
  logExtractionPipeline('Embedding finished.')

  logExtractionPipeline('Starting updating entities in db...')
  // update
  const {error} = await supabaseClient  
    .from('entities')
    .update(embeddedEntities.map((entity)=>({
      id: entity.ref_id,
      embedding: entity.embedding,
      embedding_model: entity.embeddingModel
    })))
  logExtractionPipeline('Updated entity embeddings in db to db...')

  if (error) throw error

  return embeddedEntities
}