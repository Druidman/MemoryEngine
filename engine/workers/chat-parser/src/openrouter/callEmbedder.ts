
import { getEnv } from "..";
import { callModel, EmbeddingModelParams } from "./callModel";


export interface EmbeddingEntry {
  textToEmbed: string
}
export async function callEmbedder<T extends EmbeddingEntry>(entriesToEmbed: T[])
: Promise<(T & {embedding: number[], embeddingModel: string})[]>{
  if (!getEnv().EMBEDDING_MODEL){
    throw new Error("EMBEDDING_MODEL env variable not set")
  }
  // Now call the model
  const result = await callModel<EmbeddingModelParams>(
    getEnv().EMBEDDING_MODEL,
    {
      embedding_format: 'float',
      dimensions: Number(getEnv().EMBEDDING_MODEL_DIMS),
      input: entriesToEmbed.map((entry)=>entry.textToEmbed)
    },
    "callEmbedder"
  )
  
  return entriesToEmbed.map((entry, idx)=>({
    ...entry,
    embedding: result.embeddings[idx].embedding,
    embeddingModel: getEnv().EMBEDDING_MODEL
  }))



}
