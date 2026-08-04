import { Memory } from "../../database/memories";
import { supabaseClient } from "../../database/supabaseClient";
import { logExtractionPipeline } from "../logger/log";
import { ExtractedMemoriesType } from "./callMemoryExtractor";

export async function insertMemories(extractedMemories: ExtractedMemoriesType, sessionId: string, containerId: string){
  const { data: insertedMemories, error: memoriesInsertError } =
    await supabaseClient
      .from("memories")
      .insert(
        extractedMemories.memories.map((memory) => ({
          content: memory.content,
          confidence: memory.confidence,
          type: memory.type,
          session_id: sessionId,
          container_id: containerId,
          metadata_hints: memory.supersedes_hint
            ? { supersedes: memory.supersedes_hint }
            : undefined,
        })),
      )
      .select("*")
      .overrideTypes<Memory[]>();

  if (memoriesInsertError) throw memoriesInsertError;

  logExtractionPipeline("Inserted memories");

  return insertedMemories
}