import { Memory } from "../../database/memories";
import { supabaseClient } from "../../database/supabaseClient";
import { callEntityExtractor } from "../../openrouter/callEntityExtractor";
import { EntityExtractorResultWithMemoryIdType } from "../pipeline";
import { logExtractionPipeline } from "../logger/log";

export async function extractEntities(insertedMemories: Memory[], containerId: string){
  logExtractionPipeline("Fetching known entities");

  const knownEntities = await fetchKnownEntities(containerId)

  logExtractionPipeline("Fetched known entities", knownEntities);

  // Now for each memory we need to fire extraction
  const entityExtractionResult: EntityExtractorResultWithMemoryIdType[] = await Promise.all(
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
  
  return entityExtractionResult
}

async function fetchKnownEntities(containerId: string){
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
      .eq('container_id', containerId)
      .order("updated_at", { ascending: false }) // newest first
      .limit(50);
  // This way we get top 50(k) most recently used entities

  if (knownEntitiesError) throw knownEntitiesError;
  return knownEntities
}