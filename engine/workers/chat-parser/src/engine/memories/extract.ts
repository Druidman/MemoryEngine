import { logExtractionPipeline } from "../logger/log";
import { callMemoryExtractor, ExtractedMemoriesType } from "./callMemoryExtractor";
import { Memory } from "../../database/memories";
import { SupabaseClient } from "@supabase/supabase-js";
import { MessageType } from "../../types";

export async function extractMemories(messages: MessageType[], sessionId: string, supabaseClient: SupabaseClient) : Promise<ExtractedMemoriesType> {
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
    sessionMemories
  );

  logExtractionPipeline("Extracted memories", extractedMemories);

  return extractedMemories
}