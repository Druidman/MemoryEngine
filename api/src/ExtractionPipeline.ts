import { MessageType } from "."
import { callExtractor } from "./callExtractorModel"

export async function runExtractionPipeline(
  messages: MessageType[]
){
  console.log('Extraction started started...')

  if (messages.length == 0) return

  // EXTRACT DATA WORTH SAVING
  // First extract facts, preferences, suggestions 
  

}