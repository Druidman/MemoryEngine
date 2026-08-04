import { MessageType } from "../..";
import { supabaseClient } from "../../database/supabaseClient";
import { logExtractionPipeline } from "../logger/log";
import { callMemoryExtractor, ExtractedMemoriesType } from "./callMemoryExtractor";
import { Memory } from "../../database/memories";

export async function extractMemories(messages: MessageType[], sessionId: string) : Promise<ExtractedMemoriesType> {
  const { data: sessionMemories, error } = await supabaseClient
    .from("memories")
    .select("*")
    .eq("session_id", sessionId) // single session
    .overrideTypes<Memory[]>();

  if (error) throw error;
  logExtractionPipeline("Fetched session memories");

  // Now extract facts, preferences, suggestions
  const extractedMemories = await callMemoryExtractor(
    messages,
    sessionMemories,
  );

  logExtractionPipeline("Extracted memories", extractedMemories);

  return extractedMemories
}