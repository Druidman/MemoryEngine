
import { getEnv } from "..";
import { callModel, EmbeddingModelParams } from "./callModel";


interface EmbeddingEntry {
  textToEmbed: string
}
export async function callEmbedder<T extends EmbeddingEntry>(entriesToEmbed: T[])
: Promise<(T & {embedding: number[]})[]>{
  
  // Now call the model
  const result = await callModel<EmbeddingModelParams>(
    getEnv().EMBEDDING_MODEL ?? "",
    {
      embedding_format: 'float',
      input: entriesToEmbed.map((entry)=>entry.textToEmbed)
    },
    "callEntityExtractor"
  )
  
  return entriesToEmbed.map((entry, idx)=>({
    ...entry,
    embedding: result.embeddings[idx].embedding
  }))



}
